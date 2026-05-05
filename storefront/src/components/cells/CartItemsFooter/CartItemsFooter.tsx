import { convertToLocale } from '@/lib/helpers/money';
import { getTranslations } from 'next-intl/server';

export const CartItemsFooter = async ({
  currency_code,
  price,
}: {
  currency_code: string;
  price: number;
}) => {
  const t = await getTranslations('cart');
  return (
    <div className='border rounded-sm p-4 flex items-center justify-between label-md'>
      <p className='text-secondary'>{t('deliveryFooter')}</p>
      <p>
        {convertToLocale({
          amount: price / 1,
          currency_code,
        })}
      </p>
    </div>
  );
};
