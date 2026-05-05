import { Button } from '@/components/atoms';
import { SellerReview } from '@/components/molecules';
import { SingleProductReview } from '@/types/product';
import { getTranslations } from 'next-intl/server';

export const ProductDetailsSellerReviews = async ({
  reviews,
}: {
  reviews: SingleProductReview[];
}) => {
  const t = await getTranslations('seller');
  return (
    <div className='p-4 border rounded-sm'>
      <div className='flex justify-between items-center mb-5'>
        <h4 className='uppercase heading-sm'>
          {t('sellerReviews')}
        </h4>
        <Button
          variant='tonal'
          className='uppercase label-md font-400'
        >
          {t('seeMore')}
        </Button>
      </div>
      {reviews.map((review) => (
        <SellerReview key={review.id} review={review} />
      ))}
    </div>
  );
};
