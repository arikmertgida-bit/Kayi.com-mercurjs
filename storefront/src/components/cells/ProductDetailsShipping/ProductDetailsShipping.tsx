import { ProductPageAccordion } from '@/components/molecules';
import { getTranslations } from 'next-intl/server';

export const ProductDetailsShipping = async () => {
  const t = await getTranslations('productDetails');
  return (
    <ProductPageAccordion
      heading={t('shippingTitle')}
      defaultOpen={false}
    >
      <div className='product-details'>
        <ul>
          <li>{t('shippingLine1')}</li>
          <li>{t('shippingLine2')}</li>
        </ul>
      </div>
    </ProductPageAccordion>
  );
};
