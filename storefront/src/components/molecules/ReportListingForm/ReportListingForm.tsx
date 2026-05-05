'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Textarea } from '@/components/atoms';
import { SelectField } from '../SelectField/SelectField';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const VALID_REASONS = [
  'inaccurate_product_details',
  'pricing_irregularities',
  'prohibited_item',
  'counterfeit_trademark',
  'incorrect_categorization',
  'inappropriate_media',
  'dmca_violation',
  'other',
] as const;

type FormData = {
  reason: typeof VALID_REASONS[number];
  comment: string;
};

export const ReportListingForm = ({
  onClose,
  productId,
}: {
  onClose: () => void;
  productId: string;
}) => {
  const t = useTranslations('reportForm');
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const formSchema = z.object({
    reason: z.enum(VALID_REASONS, { errorMap: () => ({ message: t('selectReason') }) }),
    comment: z
      .string()
      .min(1, t('addComment'))
      .max(1000, t('commentMaxLength')),
  });

  const REASON_OPTIONS = [
    { label: '', value: '', hidden: true },
    { label: t('inaccurateDetails'), value: 'inaccurate_product_details' },
    { label: t('pricingIrregularities'), value: 'pricing_irregularities' },
    { label: t('prohibitedItem'), value: 'prohibited_item' },
    { label: t('counterfeit'), value: 'counterfeit_trademark' },
    { label: t('incorrectCategorization'), value: 'incorrect_categorization' },
    { label: t('inappropriateMedia'), value: 'inappropriate_media' },
    { label: t('dmca'), value: 'dmca_violation' },
    { label: t('other'), value: 'other' },
  ];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    clearErrors,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: '' as FormData['reason'],
      comment: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const res = await fetch(`/api/product-reports/${productId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: data.reason, comment: data.comment }),
      });

      if (res.status === 401) {
        setServerError(t('loggedInError'));
        return;
      }
      if (res.status === 403) {
        setServerError(t('purchaseRequiredError'));
        return;
      }
      if (res.status === 409) {
        setServerError(t('alreadyReported'));
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError((body as { message?: string }).message ?? t('failedSubmit'));
        return;
      }

      setSubmitted(true);
    } catch {
      setServerError(t('networkError'));
    }
  };

  return (
    <div>
      {!submitted ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className='px-4 pb-5'>
            {serverError && (
              <p className='mb-4 label-sm text-negative'>{serverError}</p>
            )}

            <label className='label-sm'>
              <p className={cn(errors?.reason && 'text-negative')}>{t('reason')}</p>
              <SelectField
                options={REASON_OPTIONS}
                {...register('reason')}
                selectOption={(value) => {
                  setValue('reason', value as FormData['reason']);
                  clearErrors('reason');
                }}
                className={cn(errors?.reason && 'border-negative')}
              />
              {errors?.reason && (
                <p className='label-sm text-negative'>{errors.reason.message}</p>
              )}
            </label>

            <label className='label-sm'>
              <p className={cn('mt-5', errors?.comment && 'text-negative')}>{t('comment')}</p>
              <Textarea
                rows={5}
                {...register('comment')}
                className={cn(errors.comment && 'border-negative')}
              />
              {errors?.comment && (
                <p className='label-sm text-negative'>{errors.comment.message}</p>
              )}
            </label>
          </div>

          <div className='border-t px-4 pt-5'>
            <Button
              type='submit'
              className='w-full py-3 uppercase'
              disabled={isSubmitting}
            >
              {isSubmitting ? t('submitting') : t('submitListing')}
            </Button>
          </div>
        </form>
      ) : (
        <div className='text-center'>
          <div className='px-4 pb-5'>
            <h4 className='heading-lg uppercase'>{t('thankYou')}</h4>
            <p className='max-w-[466px] mx-auto mt-4 text-lg text-secondary'>
              {t('thankYouMessage')}
            </p>
          </div>

          <div className='border-t px-4 pt-5'>
            <Button className='w-full py-3 uppercase' onClick={onClose}>
              {t('gotIt')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
