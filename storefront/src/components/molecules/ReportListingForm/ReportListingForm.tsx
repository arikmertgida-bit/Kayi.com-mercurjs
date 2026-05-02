'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Textarea } from '@/components/atoms';
import { SelectField } from '../SelectField/SelectField';
import { cn } from '@/lib/utils';

const REASON_OPTIONS = [
  { label: '', value: '', hidden: true },
  { label: 'Inaccurate Product Details', value: 'inaccurate_product_details' },
  { label: 'Pricing Irregularities', value: 'pricing_irregularities' },
  { label: 'Prohibited Item', value: 'prohibited_item' },
  { label: 'Counterfeit / Trademark Violation', value: 'counterfeit_trademark' },
  { label: 'Incorrect Categorization', value: 'incorrect_categorization' },
  { label: 'Inappropriate Media', value: 'inappropriate_media' },
  { label: 'DMCA / Copyright Violation', value: 'dmca_violation' },
  { label: 'Other', value: 'other' },
];

const VALID_REASONS = REASON_OPTIONS.filter((o) => o.value !== '').map(
  (o) => o.value
) as [string, ...string[]];

const formSchema = z.object({
  reason: z.enum(VALID_REASONS, { errorMap: () => ({ message: 'Please select a reason' }) }),
  comment: z
    .string()
    .min(1, 'Please add a comment')
    .max(1000, 'Comment must be at most 1000 characters'),
});

type FormData = z.infer<typeof formSchema>;

export const ReportListingForm = ({
  onClose,
  productId,
}: {
  onClose: () => void;
  productId: string;
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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
        setServerError('You must be logged in to report a listing.');
        return;
      }
      if (res.status === 403) {
        setServerError('You can only report products you have purchased.');
        return;
      }
      if (res.status === 409) {
        setServerError('You have already reported this listing.');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError((body as { message?: string }).message ?? 'Something went wrong. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch {
      setServerError('Network error. Please check your connection and try again.');
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
              <p className={cn(errors?.reason && 'text-negative')}>Reason</p>
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
              <p className={cn('mt-5', errors?.comment && 'text-negative')}>Comment</p>
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
              {isSubmitting ? 'Submitting…' : 'Report Listing'}
            </Button>
          </div>
        </form>
      ) : (
        <div className='text-center'>
          <div className='px-4 pb-5'>
            <h4 className='heading-lg uppercase'>Thank you!</h4>
            <p className='max-w-[466px] mx-auto mt-4 text-lg text-secondary'>
              We&apos;ll check the listing to see if it violates our guidelines and take the
              necessary action to ensure a safe shopping experience for everyone. Thank you for
              helping us maintain a trusted community.
            </p>
          </div>

          <div className='border-t px-4 pt-5'>
            <Button className='w-full py-3 uppercase' onClick={onClose}>
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
