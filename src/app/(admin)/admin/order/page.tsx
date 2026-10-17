import { redirect } from 'next/navigation';

export default function AdminOrderSingularPage() {
  redirect('/admin?tab=orders');
}
