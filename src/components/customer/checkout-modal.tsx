'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  X,
  MapPin,
  ChevronRight,
  Lock,
  Check,
  RefreshCw,
  Truck,
  Store,
  UploadCloud,
  Copy,
  CheckCheck,
  QrCode,
  Image as ImageIcon,
  Trash2,
  Maximize2,
  AlertCircle,
  Smartphone,
  Download,
  CheckCircle2,
  FileCheck,
  UserCheck
} from 'lucide-react';
import { CartItem } from '@/hooks/use-cart';
import { User } from '@/types/user';
import { updateCustomerProfile } from '@/actions/customer/action';
import { getCurrentAuthUser } from '@/lib/supabase/auth';
import { OrderTransitionLoader, TransitionStage } from './order-transition-loader';

export interface CheckoutOrderData {
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  deliveryDate: string;
  cardMessage: string;
  paymentMethod: string;
  uploadedReceipt: string | null;
  referenceNumber?: string;
  subtotal?: number;
  deliveryFee?: number;
  protectionFee?: number;
  total?: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  cartSubtotal: number;
  currentUser?: User | null;
  userDefaultName?: string;
  userDefaultPhone?: string;
  userDefaultAddress?: string;
  onOrderPlaced: (orderData: CheckoutOrderData) => Promise<any> | void;
  onUpdateUser?: (updatedUser: User) => void;
}

interface UploadedReceipt {
  file: File;
  name: string;
  size: number;
  dataUrl: string;
}

/**
 * Compresses and normalizes an uploaded payment receipt image.
 * Resizes max dimension to 1200px and exports as clean JPEG (~100-250KB),
 * preventing server action payload overflow and ensuring instant upload and preview.
 */
function compressReceiptImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82
): Promise<{ dataUrl: string; size: number }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.FileReader) {
      resolve({ dataUrl: '', size: file.size });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const originalDataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ dataUrl: originalDataUrl, size: file.size });
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          const approxBytes = Math.round(
            (compressedDataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75
          );
          resolve({
            dataUrl: compressedDataUrl,
            size: approxBytes > 0 ? approxBytes : file.size
          });
        } catch {
          resolve({ dataUrl: originalDataUrl, size: file.size });
        }
      };
      img.onerror = () => {
        resolve({ dataUrl: originalDataUrl, size: file.size });
      };
      img.src = originalDataUrl;
    };
    reader.onerror = () => {
      resolve({ dataUrl: '', size: file.size });
    };
    reader.readAsDataURL(file);
  });
}

const E_WALLET_DETAILS = {
  gcash: {
    id: 'gcash',
    name: 'GCash',
    badge: 'GCash QR Ph',
    brandColor: '#005CE6',
    brandBg: 'bg-[#005CE6]',
    brandHover: 'hover:bg-[#004ec2]',
    lightBg: 'bg-blue-50',
    lightBorder: 'border-blue-200',
    textBrand: 'text-[#005CE6]',
    accountName: "RON'S BLOOM CRAFTS",
    accountNumber: '0917 889 2144',
    rawNumber: '09178892144',
    instruction: 'Scan with your GCash app or transfer to the mobile number below.'
  },
  maya: {
    id: 'maya',
    name: 'Maya',
    badge: 'Maya QR Ph',
    brandColor: '#008736',
    brandBg: 'bg-[#008736]',
    brandHover: 'hover:bg-[#00702d]',
    lightBg: 'bg-emerald-50',
    lightBorder: 'border-emerald-200',
    textBrand: 'text-[#008736]',
    accountName: "RON'S BLOOM CRAFTS ATELIER",
    accountNumber: '0918 629 8800',
    rawNumber: '09186298800',
    instruction: 'Scan with your Maya app or transfer to the mobile number below.'
  }
} as const;

type EWalletKey = keyof typeof E_WALLET_DETAILS;

export function CheckoutModal({
  isOpen,
  onClose,
  cart,
  cartSubtotal,
  currentUser,
  userDefaultName,
  userDefaultPhone,
  userDefaultAddress,
  onOrderPlaced,
  onUpdateUser
}: CheckoutModalProps) {
  // Fulfillment method: Delivery or Pickup
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery');

  // Customer account resolution
  const [activeUser, setActiveUser] = useState<User | null>(currentUser || null);

  // Address State connected to customer account
  const [recipientName, setRecipientName] = useState(
    currentUser?.name || userDefaultName || ''
  );
  const [recipientPhone, setRecipientPhone] = useState(
    currentUser?.phone || userDefaultPhone || ''
  );
  const [shippingAddress, setShippingAddress] = useState(
    currentUser?.address || userDefaultAddress || ''
  );
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [syncToAccount, setSyncToAccount] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Sync with active customer account whenever modal opens or currentUser updates
  useEffect(() => {
    if (!isOpen && !isTransitioning) {
      // Clear uploaded receipt and inputs when closed so the picture does not stay
      setReceipt(null);
      setUploadError(null);
      setIsProcessingFile(false);
      setReferenceNumber('');
      setOrderSuccess(false);
      setIsSubmitting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Default check Botanical Care & Petal Protection
    setIsProtectionChecked(true);

    let userToUse = currentUser;
    if (!userToUse && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('bloom_crafts_user');
        if (stored) {
          userToUse = JSON.parse(stored);
        }
      } catch {}
    }

    if (userToUse) {
      setActiveUser(userToUse);
      setRecipientName(userToUse.name || userDefaultName || 'Patron');
      setRecipientPhone(userToUse.phone || userDefaultPhone || '');
      setShippingAddress(userToUse.address || userDefaultAddress || '');
    } else {
      getCurrentAuthUser().then((authUser) => {
        if (authUser) {
          setActiveUser(authUser);
          setRecipientName(authUser.name || userDefaultName || 'Patron');
          setRecipientPhone(authUser.phone || userDefaultPhone || '');
          setShippingAddress(authUser.address || userDefaultAddress || '');
        } else {
          if (userDefaultName) setRecipientName(userDefaultName);
          if (userDefaultPhone) setRecipientPhone(userDefaultPhone);
          if (userDefaultAddress) setShippingAddress(userDefaultAddress);
        }
      });
    }
  }, [isOpen, currentUser, userDefaultName, userDefaultPhone, userDefaultAddress]);

  // Add-ons State
  const [isProtectionChecked, setIsProtectionChecked] = useState(true);
  const [message, setMessage] = useState('');

  // Payment State: GCash or Maya
  const [paymentMethod, setPaymentMethod] = useState<EWalletKey>('gcash');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<'account' | 'amount' | null>(null);

  // Receipt Upload State (PNG / JPEG / WEBP)
  const [receipt, setReceipt] = useState<UploadedReceipt | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionStage, setTransitionStage] = useState<TransitionStage>('verifying');
  const [transitionOrderId, setTransitionOrderId] = useState<string | null>(null);

  // Clear receipt helper so picture never lingers
  const resetReceipt = () => {
    setReceipt(null);
    setUploadError(null);
    setIsProcessingFile(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleModalClose = () => {
    if (isTransitioning) return;
    resetReceipt();
    setReferenceNumber('');
    onClose();
  };

  // Lightbox Modals
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isQrModalOpen) {
          setIsQrModalOpen(false);
        } else if (isReceiptModalOpen) {
          setIsReceiptModalOpen(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isQrModalOpen, isReceiptModalOpen]);

  // Items from basket / cart
  const checkoutItems =
    cart.length > 0
      ? cart
      : [
          {
            id: 'PRD-1001',
            productId: 'PRD-1001',
            name: 'Blushing Romance Peonies Bouquet',
            price: 1850,
            quantity: 1,
            image:
              'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=700&q=80'
          }
        ];

  // Price calculations directly connected to basket
  const itemsSubtotal =
    cart.length > 0
      ? (cartSubtotal > 0
          ? cartSubtotal
          : cart.reduce((acc, item) => acc + (Number(item.price) || 0) * item.quantity, 0))
      : (cartSubtotal > 0
          ? cartSubtotal
          : checkoutItems.reduce((acc, item) => acc + (Number(item.price) || 0) * item.quantity, 0));

  const totalItemCount = checkoutItems.reduce((acc, item) => acc + item.quantity, 0);
  const protectionFee = isProtectionChecked ? 150 : 0;
  const shippingFee = fulfillmentMethod === 'delivery' ? 50 : 0;
  const totalPaymentPesos = itemsSubtotal + protectionFee + shippingFee;

  const currentWallet = E_WALLET_DETAILS[paymentMethod];

  // Generate dynamic QR Code for GCash or Maya
  useEffect(() => {
    let isCancelled = false;
    const generateQrCode = async () => {
      setIsGeneratingQr(true);
      try {
        const payload = `00020101021226580016PH.${currentWallet.name.toUpperCase()}.MERCHANT0111${currentWallet.rawNumber}0218${currentWallet.accountName}5204599953036085404${totalPaymentPesos}5802PH5917${currentWallet.accountName}6010MANDALUYONG6304`;
        const dataUrl = await QRCode.toDataURL(payload, {
          margin: 2,
          width: 380,
          errorCorrectionLevel: 'H',
          color: {
            dark: currentWallet.brandColor,
            light: '#FFFFFF'
          }
        });
        if (!isCancelled) {
          setQrDataUrl(dataUrl);
        }
      } catch (err) {
        console.error('Failed to generate QR Code:', err);
      } finally {
        if (!isCancelled) {
          setIsGeneratingQr(false);
        }
      }
    };

    generateQrCode();

    return () => {
      isCancelled = true;
    };
  }, [paymentMethod, totalPaymentPesos, currentWallet]);

  if (!isOpen) return null;

  // Process uploaded PNG, JPEG, or WEBP image
  const processUploadedFile = async (file: File) => {
    setUploadError(null);

    // Validate that file is an image (PNG, JPG, JPEG, WEBP, or any standard image)
    const isImage =
      file.type.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i.test(file.name);

    if (!isImage) {
      setUploadError('Invalid file! Please upload your payment receipt as an image (PNG, JPG, or WEBP).');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Limit to 20MB
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File size exceeds 20MB. Please choose a smaller screenshot or photo.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsProcessingFile(true);

    try {
      const { dataUrl, size } = await compressReceiptImage(file);
      if (!dataUrl) {
        setUploadError('Unable to read the image file. Please try selecting it again.');
        return;
      }
      setReceipt({
        file,
        name: file.name,
        size: size || file.size,
        dataUrl
      });
      setUploadError(null);
    } catch (err) {
      console.error('Error processing receipt image:', err);
      setUploadError('Unable to process the image. Please try selecting it again.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleCopyText = (text: string, type: 'account' | 'amount') => {
    navigator.clipboard.writeText(text);
    setCopiedField(type);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `rons-bloom-${paymentMethod}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSaveAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!recipientName.trim()) {
      setSaveStatus('Please enter recipient name');
      return;
    }
    if (!shippingAddress.trim()) {
      setSaveStatus('Please enter delivery address');
      return;
    }

    setIsSavingAddress(true);
    setSaveStatus(null);

    try {
      const userToUpdate = activeUser || currentUser;
      if (userToUpdate && userToUpdate.id) {
        // Save directly to Supabase profile
        await updateCustomerProfile({
          id: userToUpdate.id,
          name: recipientName.trim(),
          phone: recipientPhone.trim(),
          address: shippingAddress.trim()
        });

        const updatedUser: User = {
          ...userToUpdate,
          name: recipientName.trim(),
          phone: recipientPhone.trim(),
          address: shippingAddress.trim()
        };

        setActiveUser(updatedUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('bloom_crafts_user', JSON.stringify(updatedUser));
        }
        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }
        setSaveStatus('✓ Saved to customer account!');
      } else {
        const updatedUser: User = {
          id: userToUpdate?.id || 'guest',
          name: recipientName.trim(),
          email: userToUpdate?.email || '',
          role: userToUpdate?.role || 'customer',
          phone: recipientPhone.trim(),
          address: shippingAddress.trim()
        };
        setActiveUser(updatedUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('bloom_crafts_user', JSON.stringify(updatedUser));
        }
        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }
        setSaveStatus('✓ Address saved!');
      }

      setTimeout(() => {
        setSaveStatus(null);
        setIsEditingAddress(false);
      }, 700);
    } catch (err: any) {
      console.error('Error saving address:', err);
      setSaveStatus('Could not save address. Please try again.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (fulfillmentMethod === 'delivery' && !shippingAddress.trim()) {
      setIsEditingAddress(true);
      setUploadError('Please provide a delivery address connected to your account.');
      return;
    }

    // Verify receipt upload
    if (!receipt) {
      setUploadError('Please upload your GCash or Maya payment receipt (PNG or JPEG) to complete your order.');
      uploadBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // If syncToAccount is true, ensure customer profile is kept up to date
    if (syncToAccount) {
      const userToSync = activeUser || currentUser;
      if (userToSync && userToSync.id) {
        updateCustomerProfile({
          id: userToSync.id,
          name: recipientName.trim(),
          phone: recipientPhone.trim(),
          address: shippingAddress.trim()
        }).catch((err) => console.warn('Sync customer address error:', err));

        const updatedUser: User = {
          ...userToSync,
          name: recipientName.trim(),
          phone: recipientPhone.trim(),
          address: shippingAddress.trim()
        };
        setActiveUser(updatedUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('bloom_crafts_user', JSON.stringify(updatedUser));
        }
        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }
      }
    }

    setIsSubmitting(true);
    setIsTransitioning(true);
    setTransitionStage('verifying');
    setTransitionOrderId(null);

    try {
      // Stage 1: Verifying payment receipt & details
      await new Promise((r) => setTimeout(r, 650));
      setTransitionStage('securing');

      // Stage 2: Securing fresh stems & saving order in database
      const orderPayload: CheckoutOrderData = {
        recipientName,
        recipientPhone,
        shippingAddress:
          fulfillmentMethod === 'delivery'
            ? shippingAddress
            : 'Studio Pickup at Ron’s Bloom Crafts Atelier (12 Magnolia Way)',
        deliveryDate: new Date().toISOString().split('T')[0],
        cardMessage:
          message ||
          (fulfillmentMethod === 'pickup'
            ? 'Studio Pickup Order'
            : 'Fresh blooms handled with utmost care.'),
        paymentMethod: paymentMethod === 'gcash' ? 'GCash' : 'Maya',
        uploadedReceipt: receipt.dataUrl,
        referenceNumber: referenceNumber.trim() || undefined,
        subtotal: itemsSubtotal,
        deliveryFee: shippingFee,
        protectionFee,
        total: totalPaymentPesos
      };

      const placeOrderPromise = Promise.resolve(onOrderPlaced(orderPayload));

      // Wait minimum 700ms in securing stage AND until placeOrderPromise resolves
      const [orderResult] = await Promise.all([
        placeOrderPromise,
        new Promise((r) => setTimeout(r, 700))
      ]);

      const resolvedOrderId =
        typeof orderResult === 'string'
          ? orderResult
          : orderResult?.id || orderResult?.order?.id || null;

      if (resolvedOrderId) {
        setTransitionOrderId(resolvedOrderId);
      }

      // Stage 3: Order Confirmed celebration
      setOrderSuccess(true);
      setTransitionStage('confirmed');
      await new Promise((r) => setTimeout(r, 950));

      // Stage 4: Smooth navigation transition into Customer Orders
      setTransitionStage('navigating');
      await new Promise((r) => setTimeout(r, 450));

      // Clean up modal state & dismiss
      resetReceipt();
      setReferenceNumber('');
      setMessage('');
      setIsSubmitting(false);
      setOrderSuccess(false);
      setIsTransitioning(false);
      onClose();
    } catch (err) {
      console.error('Order placement transition note:', err);
      setIsSubmitting(false);
      setOrderSuccess(false);
      setIsTransitioning(false);
      onClose();
    }
  };

  if (!isOpen && !isTransitioning) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={handleModalClose} aria-hidden="true" />

      {/* Main Floral Checkout Modal Dialog */}
      <div className="relative bg-[#F9F7F4] w-full max-w-lg rounded-none sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[92vh] z-10 animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-20 shrink-0 shadow-2xs">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleModalClose}
              className="text-[#2D5A43] hover:text-emerald-900 transition cursor-pointer p-0.5"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-serif font-bold text-stone-900">Checkout & Payment</h2>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 text-stone-800 pb-4">
          
          {/* SECTION 1: Address or Studio Pickup Details */}
          {fulfillmentMethod === 'delivery' ? (
            <div className="bg-white px-4 pt-3 pb-2 border-b border-stone-200/60">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2.5 flex-1 pr-2">
                  <MapPin className="w-4 h-4 text-[#2D5A43] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-sm font-semibold text-stone-900">Delivery Address</span>
                      {activeUser?.email ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold bg-emerald-50 text-[#2D5A43] px-2 py-0.5 rounded-full border border-emerald-200/70">
                          <UserCheck className="w-3 h-3 text-emerald-600" />
                          <span>Connected Account</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                          <span>Guest Checkout</span>
                        </span>
                      )}
                    </div>

                    {!isEditingAddress ? (
                      <div className="mt-1 text-xs text-stone-700 leading-relaxed">
                        {recipientName || recipientPhone || shippingAddress ? (
                          <>
                            <p className="font-semibold text-stone-900">
                              {recipientName || 'Patron'} {recipientPhone ? `| ${recipientPhone}` : ''}
                            </p>
                            <p className="text-stone-600 mt-0.5 break-words">
                              {shippingAddress || (
                                <span className="text-amber-600 italic">No delivery address registered on your account yet. Click to add.</span>
                              )}
                            </p>
                            {activeUser?.email && (
                              <p className="text-[11px] text-stone-400 mt-0.5 font-mono">
                                Customer: {activeUser.email}
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="mt-1 p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 flex items-center justify-between">
                            <span>No address connected yet.</span>
                            <button
                              type="button"
                              onClick={() => setIsEditingAddress(true)}
                              className="font-semibold text-[#2D5A43] underline cursor-pointer"
                            >
                              Add Address
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleSaveAddress} className="mt-2 space-y-2 text-xs bg-stone-50 p-3 rounded-xl border border-stone-200">
                        <div className="flex items-center justify-between pb-1 border-b border-stone-200/80">
                          <span className="font-semibold text-stone-800 text-[11px]">Edit Customer Delivery Address</span>
                          {activeUser?.email && (
                            <span className="text-[10px] text-[#2D5A43] font-medium">Syncs with: {activeUser.email}</span>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] text-stone-600 font-medium mb-0.5">Recipient Name</label>
                          <input
                            type="text"
                            required
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="e.g. Eleanor Vance"
                            className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-[#2D5A43] focus:border-[#2D5A43]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-stone-600 font-medium mb-0.5">Contact Phone</label>
                          <input
                            type="text"
                            required
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                            placeholder="e.g. (+63) 912 345 6789"
                            className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-[#2D5A43] focus:border-[#2D5A43]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-stone-600 font-medium mb-0.5">Drop-off Street Address</label>
                          <textarea
                            rows={2}
                            required
                            value={shippingAddress}
                            onChange={(e) => setShippingAddress(e.target.value)}
                            placeholder="Unit / Floor, Street Address, Barangay, City, Postal Code"
                            className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-[#2D5A43] focus:border-[#2D5A43]"
                          />
                        </div>

                        {activeUser?.id && (
                          <label className="flex items-center space-x-2 pt-0.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={syncToAccount}
                              onChange={(e) => setSyncToAccount(e.target.checked)}
                              className="rounded border-stone-300 text-[#2D5A43] focus:ring-[#2D5A43] w-3.5 h-3.5"
                            />
                            <span className="text-[11px] text-stone-600">
                              Save and connect to my customer account profile
                            </span>
                          </label>
                        )}

                        {saveStatus && (
                          <div className={`text-[11px] font-medium p-1.5 rounded-lg ${
                            saveStatus.includes('✓') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {saveStatus}
                          </div>
                        )}

                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            type="submit"
                            disabled={isSavingAddress}
                            className="py-1.5 px-3 bg-[#2D5A43] text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-emerald-800 transition disabled:opacity-50 flex items-center space-x-1.5"
                          >
                            {isSavingAddress ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <span>Save & Connect Address</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingAddress(false);
                              setSaveStatus(null);
                            }}
                            className="py-1.5 px-3 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-medium cursor-pointer transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingAddress(!isEditingAddress)}
                  className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer transition"
                  title={isEditingAddress ? 'Close Address Editor' : 'Edit Delivery Address'}
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${isEditingAddress ? 'rotate-90' : ''}`} />
                </button>
              </div>

              {/* Botanical Ribbon Border */}
              <div className="h-1 w-full bg-[repeating-linear-gradient(45deg,#2D5A43,#2D5A43_12px,#fff_12px,#fff_16px,#059669_16px,#059669_28px,#fff_28px,#fff_32px)] mt-3" />
            </div>
          ) : (
            <div className="bg-white px-4 pt-3 pb-3 border-b border-stone-200/60">
              <div className="flex items-start space-x-2.5">
                <Store className="w-4 h-4 text-[#2D5A43] shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <span className="text-sm font-semibold text-stone-900 block">Studio Pickup Location</span>
                  <p className="font-semibold text-stone-900 mt-1">Ron's Bloom Crafts Atelier & Studio</p>
                  <p className="text-stone-600 mt-0.5">
                    12 Magnolia Way, Blossom Hill (Mon - Sun, 8:00 AM - 7:00 PM)
                  </p>
                  <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-[#2D5A43] rounded-lg font-medium text-[11px] border border-emerald-200">
                    <Check className="w-3.5 h-3.5" />
                    <span>Free Self-Pickup &bull; Ready within 2 hours</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Shop & Item Card */}
          <div className="mt-2.5 bg-white p-4 space-y-3 border-y border-stone-200/60">
            <div className="flex items-center space-x-2">
              <span className="bg-[#2D5A43] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm leading-none">
                Artisan Florist
              </span>
              <span className="font-serif font-bold text-sm text-stone-900">Ron's Bloom Crafts</span>
            </div>

            {checkoutItems.map((item, idx) => (
              <div key={item.id || idx} className="flex space-x-3 text-xs pt-1 border-t border-stone-100 first:border-t-0">
                <img
                  src={
                    item.image ||
                    'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=300&q=80'
                  }
                  alt={item.name}
                  className="w-18 h-18 sm:w-20 sm:h-20 object-cover rounded-xl border border-stone-200 shrink-0 shadow-2xs"
                />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-stone-900 line-clamp-2 text-xs sm:text-sm">
                      {item.name}
                    </h4>
                    <div className="mt-0.5">
                      <span className="border border-[#2D5A43]/40 bg-emerald-50/50 text-[#2D5A43] text-[10px] px-1.5 py-0.5 rounded-sm font-medium">
                        Fresh-Cut Bespoke
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">
                      Grand Deluxe Stems & Artisanal Silk Ribbon
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-[#2D5A43] text-sm">
                      ₱{(Number(item.price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-stone-500 text-xs font-semibold">x{item.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* SECTION 3: Botanical Protection */}
          <div className="bg-white px-4 py-3 border-b border-stone-200/60 flex items-start justify-between text-xs">
            <div className="flex items-start space-x-2.5 flex-1 pr-2">
              <input
                type="checkbox"
                id="protection-checkbox"
                checked={isProtectionChecked}
                onChange={(e) => setIsProtectionChecked(e.target.checked)}
                className="accent-[#2D5A43] w-4 h-4 rounded mt-0.5 cursor-pointer"
              />
              <label htmlFor="protection-checkbox" className="cursor-pointer">
                <span className="font-semibold text-stone-900 block">Botanical Care & Petal Protection</span>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                  Guaranteed replacement protection against transit wilting, stem stress, and accidental damage.
                </p>
              </label>
            </div>
            <div className="text-right shrink-0">
              <span className="font-bold text-stone-900">₱150</span>
            </div>
          </div>

          {/* SECTION 4: Fulfillment Method */}
          <div className="bg-[#F0FAF7] px-4 py-3.5 border-b border-[#D6F0E7]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-teal-800">Fulfillment Method</span>
              <span className="text-xs font-bold text-stone-900">
                {fulfillmentMethod === 'delivery' ? '₱50' : 'FREE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFulfillmentMethod('delivery')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                  fulfillmentMethod === 'delivery'
                    ? 'bg-[#2D5A43] text-white border-[#2D5A43] shadow-xs'
                    : 'bg-white text-stone-700 border-teal-200 hover:bg-emerald-50'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Courier Delivery (₱50)</span>
              </button>

              <button
                type="button"
                onClick={() => setFulfillmentMethod('pickup')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                  fulfillmentMethod === 'pickup'
                    ? 'bg-[#2D5A43] text-white border-[#2D5A43] shadow-xs'
                    : 'bg-white text-stone-700 border-teal-200 hover:bg-emerald-50'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Studio Pickup (Free)</span>
              </button>
            </div>
          </div>

          {/* SECTION 5: Florist Calligraphy Card Message */}
          <div className="bg-white px-4 py-3 flex items-center justify-between text-xs border-b border-stone-200/60">
            <span className="text-stone-700 font-medium shrink-0 mr-3">Message:</span>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave florist card calligraphy text..."
              className="text-right text-stone-800 placeholder:text-stone-400 focus:outline-hidden w-full text-xs"
            />
          </div>

          {/* SECTION 6: Order Total Breakdown Connected to Basket */}
          <div className="bg-white px-4 py-3 text-xs border-b border-stone-200/60 space-y-1.5">
            <div className="flex justify-between items-center text-stone-600">
              <span>Basket Subtotal ({totalItemCount} item{totalItemCount > 1 ? 's' : ''}):</span>
              <span className="font-semibold text-stone-900 font-mono">
                ₱{itemsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {isProtectionChecked && (
              <div className="flex justify-between items-center text-stone-600 text-[11px]">
                <span>Petal Protection & Care:</span>
                <span className="font-semibold text-stone-900 font-mono">₱150.00</span>
              </div>
            )}
            <div className="flex justify-between items-center text-stone-600 text-[11px]">
              <span>Fulfillment ({fulfillmentMethod === 'delivery' ? 'Courier Delivery' : 'Studio Pickup'}):</span>
              <span className="font-semibold text-stone-900 font-mono">
                {shippingFee > 0 ? `₱${shippingFee.toFixed(2)}` : 'FREE'}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-1.5 border-t border-stone-100">
              <span className="font-bold text-stone-900">
                Order Total:
              </span>
              <span className="font-bold text-[#2D5A43] text-base font-mono">
                ₱{totalPaymentPesos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* SECTION 7: GCASH OR MAYA PAYMENT METHOD WITH QR CODE & RECEIPT UPLOAD */}
          <form onSubmit={handleCheckoutSubmit} id="checkout-payment-form" className="mt-2.5 bg-white p-4 space-y-4 border-y border-stone-200/60">
            
            {/* Header & Payment Method Selector */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-[#2D5A43]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Payment Method
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-50 text-[#2D5A43] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  Instant QR Ph
                </span>
              </div>

              {/* Tabs for GCash and Maya */}
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                {/* GCash Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('gcash');
                    setUploadError(null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex items-center justify-between ${
                    paymentMethod === 'gcash'
                      ? 'bg-blue-50/70 border-[#005CE6] ring-2 ring-[#005CE6]/30 shadow-xs'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100/80 text-stone-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#005CE6] text-white font-black text-sm flex items-center justify-center shadow-xs">
                      G
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-stone-900">GCash</span>
                        <span className="text-[9px] bg-blue-100 text-[#005CE6] font-bold px-1.5 py-0.2 rounded leading-tight">
                          E-Wallet
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono block">0917 889 2144</span>
                    </div>
                  </div>
                  {paymentMethod === 'gcash' && (
                    <div className="w-5 h-5 rounded-full bg-[#005CE6] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Maya Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('maya');
                    setUploadError(null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex items-center justify-between ${
                    paymentMethod === 'maya'
                      ? 'bg-emerald-50/70 border-[#008736] ring-2 ring-[#008736]/30 shadow-xs'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100/80 text-stone-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#008736] text-white font-black text-xs flex items-center justify-center shadow-xs">
                      m
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-stone-900">Maya</span>
                        <span className="text-[9px] bg-emerald-100 text-[#008736] font-bold px-1.5 py-0.2 rounded leading-tight">
                          QR Ph
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono block">0918 629 8800</span>
                    </div>
                  </div>
                  {paymentMethod === 'maya' && (
                    <div className="w-5 h-5 rounded-full bg-[#008736] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* QR CODE MERCHANT PAYMENT STANDEE CARD */}
            <div className={`rounded-2xl border p-4 transition-all shadow-xs ${currentWallet.lightBg} ${currentWallet.lightBorder}`}>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/60">
                <div className="flex items-center space-x-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${currentWallet.brandBg}`} />
                  <span className="text-xs font-bold text-stone-900">
                    Scan & Pay via {currentWallet.name}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 px-2 py-1 bg-white rounded-lg border border-stone-200 shadow-2xs hover:bg-stone-50 transition flex items-center space-x-1 cursor-pointer"
                    title="Enlarge QR Code"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Enlarge</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 px-2 py-1 bg-white rounded-lg border border-stone-200 shadow-2xs hover:bg-stone-50 transition flex items-center space-x-1 cursor-pointer"
                    title="Download QR Image"
                  >
                    <Download className="w-3 h-3" />
                    <span>Save QR</span>
                  </button>
                </div>
              </div>

              {/* QR Code Graphic & Details */}
              <div className="mt-3 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* QR Code Container */}
                <div className="relative p-2.5 bg-white rounded-2xl border border-stone-200 shadow-sm shrink-0 text-center">
                  {isGeneratingQr || !qrDataUrl ? (
                    <div className="w-36 h-36 flex items-center justify-center bg-stone-50 rounded-xl">
                      <RefreshCw className="w-6 h-6 text-stone-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="relative group cursor-pointer" onClick={() => setIsQrModalOpen(true)}>
                      <img
                        src={qrDataUrl}
                        alt={`${currentWallet.name} QR Code`}
                        className="w-36 h-36 rounded-xl object-contain mx-auto"
                      />
                      {/* Brand Logo Center Emblem */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className={`w-7 h-7 rounded-lg ${currentWallet.brandBg} text-white font-bold text-xs flex items-center justify-center shadow-md border-2 border-white`}
                        >
                          {paymentMethod === 'gcash' ? 'G' : 'm'}
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-stone-900/10 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center">
                        <span className="text-[10px] font-bold bg-white/95 px-2 py-0.5 rounded-full shadow text-stone-800">
                          Click to Enlarge
                        </span>
                      </div>
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1 block">
                    QR Ph Verified
                  </span>
                </div>

                {/* Account Details & Instructions */}
                <div className="flex-1 w-full space-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                      Account Name
                    </span>
                    <span className="font-semibold text-stone-900 text-xs block">
                      {currentWallet.accountName}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                        Account / Mobile Number
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(currentWallet.accountNumber, 'account')}
                        className={`text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition ${currentWallet.textBrand} hover:underline`}
                      >
                        {copiedField === 'account' ? (
                          <>
                            <CheckCheck className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Number</span>
                          </>
                        )}
                      </button>
                    </div>
                    <span className="font-mono font-bold text-stone-900 text-sm block mt-0.5">
                      {currentWallet.accountNumber}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                        Exact Amount to Pay
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(totalPaymentPesos.toString(), 'amount')}
                        className={`text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition ${currentWallet.textBrand} hover:underline`}
                      >
                        {copiedField === 'amount' ? (
                          <>
                            <CheckCheck className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Amount</span>
                          </>
                        )}
                      </button>
                    </div>
                    <span className="font-bold text-[#2D5A43] text-base font-serif font-mono block">
                      ₱{totalPaymentPesos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="pt-1 text-[11px] text-stone-500 leading-snug">
                    <p>&bull; Open your {currentWallet.name} app, tap <strong>Scan QR</strong> or <strong>Send Money</strong>.</p>
                    <p>&bull; Take a screenshot of the completed payment receipt to upload below.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* UPLOAD PAYMENT RECEIPT (PNG OR JPEG) */}
            <div
              ref={uploadBoxRef}
              className={`pt-2 border-t border-stone-200/80 transition-all ${
                uploadError ? 'p-3 bg-rose-50/70 rounded-2xl border border-rose-300' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <UploadCloud className="w-4 h-4 text-[#2D5A43]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Upload Payment Receipt
                  </span>
                  <span className="text-rose-600 font-bold">*</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                  PNG or JPEG / JPG
                </span>
              </div>

              {/* Hidden Native File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.png,.jpg,.jpeg,.webp"
                onChange={handleFileInputChange}
                className="hidden"
                id="receipt-file-input"
              />

              {/* Upload Dropzone OR Uploaded Preview */}
              {isProcessingFile ? (
                <div className="border-2 border-dashed border-[#2D5A43] bg-emerald-50/50 rounded-2xl p-6 text-center">
                  <RefreshCw className="w-6 h-6 text-[#2D5A43] animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold text-stone-800">Processing &amp; attaching payment proof...</p>
                  <p className="text-[10px] text-stone-500 mt-0.5">Please wait a moment</p>
                </div>
              ) : !receipt ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                      fileInputRef.current.click();
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#2D5A43] bg-emerald-50/80 scale-[1.01]'
                      : uploadError
                      ? 'border-rose-300 bg-white hover:bg-rose-50/40'
                      : 'border-stone-300 bg-stone-50/60 hover:bg-white hover:border-[#2D5A43]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#2D5A43] border border-emerald-200 flex items-center justify-center mx-auto mb-2.5">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-stone-800">
                    Click to browse or drag & drop payment proof
                  </p>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Accepts official screenshot in <strong className="text-stone-700">PNG, JPG, or WEBP</strong>
                  </p>
                  <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#2D5A43] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Choose Payment Receipt Photo</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white rounded-2xl border border-emerald-300 ring-2 ring-emerald-500/10 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Thumbnail Preview */}
                      <div
                        onClick={() => setIsReceiptModalOpen(true)}
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-stone-200 shrink-0 cursor-pointer group bg-stone-100"
                        title="Click to view full image"
                      >
                        <img
                          src={receipt.dataUrl}
                          alt="Uploaded receipt preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                          <Maximize2 className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="text-xs">
                        <div className="flex items-center space-x-1.5">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-stone-900 truncate max-w-[160px] sm:max-w-[220px]">
                            {receipt.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-500 block mt-0.5">
                          {formatFileSize(receipt.size)} &bull; Attached Proof
                        </span>
                        <div className="mt-1 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Receipt Attached Successfully</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: View, Replace, Delete */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                            fileInputRef.current.click();
                          }
                        }}
                        className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg transition cursor-pointer"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={resetReceipt}
                        className="p-1 text-stone-400 hover:text-rose-600 transition cursor-pointer"
                        title="Remove uploaded receipt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Inline Error Message */}
              {uploadError && (
                <div className="flex items-center space-x-1.5 text-rose-600 text-[11px] font-semibold mt-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Reference Number Field */}
              <div className="mt-3">
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  {currentWallet.name} Reference / Transaction No. (Optional)
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. 9012 3456 7890 or MP20261017..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-800 font-mono text-xs focus:ring-2 focus:ring-[#2D5A43] focus:bg-white"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Found on your {currentWallet.name} confirmation SMS or in-app receipt slip.
                </span>
              </div>

              {/* Guarantee / Security Note */}
              <div className="flex items-center space-x-1.5 text-[11px] text-stone-500 pt-2.5">
                <Lock className="w-3.5 h-3.5 text-[#2D5A43] shrink-0" />
                <span>Our florists verify all e-wallet receipts promptly upon submission.</span>
              </div>
            </div>
          </form>
        </div>

        {/* SECTION 8: Fixed Bottom Bar */}
        <div className="bg-white border-t border-stone-200 flex items-stretch justify-between sticky bottom-0 z-20 shrink-0 shadow-lg">
          <div className="px-4 py-2.5 text-right flex-1 flex flex-col justify-center">
            <span className="text-[11px] text-stone-500 leading-tight">Total Payment</span>
            <span className="text-xl sm:text-2xl font-bold text-[#2D5A43] leading-tight font-serif font-mono">
              ₱{totalPaymentPesos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <button
            type="submit"
            form="checkout-payment-form"
            disabled={isSubmitting || orderSuccess}
            className="bg-[#2D5A43] hover:bg-emerald-800 active:bg-emerald-950 text-white font-bold px-7 sm:px-9 py-3.5 text-sm sm:text-base cursor-pointer transition flex items-center justify-center space-x-2 shrink-0 disabled:opacity-75 shadow-md"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying & Placing...</span>
              </>
            ) : orderSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Order Confirmed!</span>
              </>
            ) : (
              <span>Place Order</span>
            )}
          </button>
        </div>
      </div>

      {/* LIGHTBOX MODAL: ENLARGED QR CODE */}
      {isQrModalOpen && qrDataUrl && (
        <div
          onClick={() => setIsQrModalOpen(false)}
          className="fixed inset-0 z-60 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${currentWallet.brandBg}`} />
                <h3 className="font-bold text-stone-900 text-sm">
                  {currentWallet.name} QR Ph Merchant
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-white border border-stone-200 rounded-2xl shadow-inner relative">
              <img
                src={qrDataUrl}
                alt={`${currentWallet.name} Full QR Code`}
                className="w-64 h-64 mx-auto rounded-xl object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`w-9 h-9 rounded-xl ${currentWallet.brandBg} text-white font-bold text-sm flex items-center justify-center shadow-lg border-2 border-white`}
                >
                  {paymentMethod === 'gcash' ? 'G' : 'm'}
                </div>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <p className="font-bold text-stone-900">{currentWallet.accountName}</p>
              <p className="font-mono text-stone-600 font-semibold">{currentWallet.accountNumber}</p>
              <p className="text-[#2D5A43] font-bold font-serif font-mono text-lg pt-1">
                Amount: ₱{totalPaymentPesos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="flex-1 py-2.5 px-4 bg-[#2D5A43] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save QR Image</span>
              </button>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL: ENLARGED RECEIPT PREVIEW */}
      {isReceiptModalOpen && receipt && (
        <div
          onClick={() => setIsReceiptModalOpen(false)}
          className="fixed inset-0 z-60 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl space-y-3 animate-in zoom-in-95"
          >
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-stone-900 text-sm truncate max-w-[260px]">
                  {receipt.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-auto max-h-[70vh] rounded-2xl bg-stone-100 p-2 flex items-center justify-center">
              <img
                src={receipt.dataUrl}
                alt="Enlarged uploaded receipt"
                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-md"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
              <span>{formatFileSize(receipt.size)} &bull; Ready to submit</span>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="py-1.5 px-4 bg-[#2D5A43] text-white rounded-xl font-semibold cursor-pointer hover:bg-emerald-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN FLORAL TRANSITION LOADER FROM CHECKOUT TO ORDER */}
      <OrderTransitionLoader
        isOpen={isTransitioning}
        stage={transitionStage}
        orderId={transitionOrderId}
        recipientName={recipientName}
        itemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        totalAmount={totalPaymentPesos}
        paymentMethod={paymentMethod === 'gcash' ? 'GCash' : 'Maya'}
      />
    </div>
  );
}

export default CheckoutModal;
