import { redirect } from 'next/navigation';

export default function BestSellersPage() {
  redirect('/admin?tab=best-sellers');
}
