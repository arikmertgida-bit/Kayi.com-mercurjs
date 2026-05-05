import { Cart } from '@/components/sections';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Sepet',
  description: 'Sepetim',
};

export default function CartPage({}) {
  return (
    <main className='container grid grid-cols-12'>
      <Suspense fallback={<>Loading...</>}>
        <Cart />
      </Suspense>
    </main>
  );
}
