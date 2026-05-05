'use client';

import { Button } from '@/components/atoms';
import { useState } from 'react';
import { Modal } from '../Modal/Modal';
import { ReportListingForm } from '../ReportListingForm/ReportListingForm';
import { useTranslations } from 'next-intl';

export const ProductReportButton = ({ productId }: { productId: string }) => {
  const [openModal, setOpenModal] = useState(false);
  const t = useTranslations('productDetails');
  return (
    <>
      <Button
        className='uppercase label-md'
        variant='tonal'
        onClick={() => setOpenModal(true)}
      >
        {t('reportListing')}
      </Button>
      {openModal && (
        <Modal
          heading={t('reportListing')}
          onClose={() => setOpenModal(false)}
        >
          <ReportListingForm
            onClose={() => setOpenModal(false)}
            productId={productId}
          />
        </Modal>
      )}
    </>
  );
};
