import { redirect } from 'next/navigation';

export default function ProductsMgmtPage() {
  redirect('/admin?tab=products');
}
