import {
  ProductPostedDate,
  ProductReportButton,
  ProductTags,
} from '@/components/molecules';
import { HttpTypes } from '@medusajs/types';

export const ProductDetailsFooter = ({
  tags = [],
  posted,
  id,
}: {
  tags?: HttpTypes.StoreProductTag[];
  posted: HttpTypes.StoreProduct['created_at'];
  id: string;
}) => {
  return (
    <>
      <div className='p-4 border rounded-sm'>
        <ProductTags tags={tags} />
        <div className='flex justify-between items-center mt-4'>
          <ProductPostedDate posted={posted} />
          <ProductReportButton productId={id} />
        </div>
      </div>
    </>
  );
};
