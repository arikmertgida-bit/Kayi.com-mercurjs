import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getTranslations } from 'next-intl/server';

export const ProductPostedDate = async ({
  posted,
}: {
  posted: string | null;
}) => {
  const t = await getTranslations('productDetails')
  const postedDate = formatDistanceToNow(
    new Date(posted || ''),
    { addSuffix: true, locale: tr }
  );

  return (
    <p className='label-md text-secondary'>
      {t('posted')} {postedDate}
    </p>
  );
};
