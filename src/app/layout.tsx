import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rons-bloom-crafts.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ron's Bloom Crafts | Artisan Floral Atelier & Botanical Gifts",
    template: "%s | Ron's Bloom Crafts",
  },
  description: "Bespoke floral sculptures, handcrafted satin ribbon roses, fuzzy wire blooms, and preserved arrangements crafted with love.",
  openGraph: {
    title: "Ron's Bloom Crafts | Artisan Floral Atelier",
    description: "Hand-crafted bespoke floral arrangements and botanical gifts made with devotion.",
    url: siteUrl,
    siteName: "Ron's Bloom Crafts",
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ron's Bloom Crafts",
    description: "Hand-crafted bespoke floral arrangements and botanical gifts.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
