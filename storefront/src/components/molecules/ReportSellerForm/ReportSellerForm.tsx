'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@medusajs/ui';
import { Button, Textarea } from '@/components/atoms';
import { SelectField } from '../SelectField/SelectField';
import { cn } from '@/lib/utils';

const reasonOptions = [
  { label: '', value: '', hidden: true },
  {
    label: 'Trademark, Copyright or DMCA Violation',
    value: 'Trademark, Copyright or DMCA Violation',
  },
];

const formSchema = z.object({
  reason: z.string().nonempty('Please select reason'),
  comment: z.string().nonempty('Please add comment'),
});

type FormData = z.infer<typeof formSchema>;

export const ReportSellerForm = ({
  sellerId,
  onClose,
}: {
  sellerId: string
  onClose: () => void;
}) => {
  const [isSuccess, setIsSuccess] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    clearErrors,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: '',
      comment: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch('/api/seller-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, ...data }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        toast.error(err.error ?? 'Failed to submit report. Please try again.')
        return
      }
      setIsSuccess(true)
    } catch {
      toast.error('Network error. Please check your connection and try again.')
    }
  };

  return (
    <div>
      {!isSuccess ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className='px-4 pb-5'>
            <label className='label-sm'>
              <p
                className={cn(
                  errors?.reason && 'text-negative'
                )}
              >
                Reason
              </p>
              <SelectField
                options={reasonOptions}
                {...register('reason')}
                selectOption={(value) => {
                  setValue('reason', value);
                  clearErrors('reason');
                }}
                className={cn(
                  errors?.reason && 'border-negative'
                )}
              />
              {errors?.reason && (
                <p className='label-sm text-negative'>
                  {errors.reason.message}
                </p>
              )}
            </label>

            <label className='label-sm'>
              <p
                className={cn(
                  'mt-5',
                  errors?.comment && 'text-negative'
                )}
              >
                Comment
              </p>
              <Textarea
                rows={5}
                {...register('comment')}
                className={cn(
                  errors.comment && 'border-negative'
                )}
              />
              {errors?.comment && (
                <p className='label-sm text-negative'>
                  {errors.comment.message}
                </p>
              )}
            </label>
          </div>

          <div className='border-t px-4 pt-5'>
            <Button
              type='submit'
              className='w-full py-3 uppercase'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Report Seller'}
            </Button>
          </div>
        </form>
      ) : (
        <div className='text-center'>
          <div className='px-4 pb-5'>
            <h4 className='heading-lg uppercase'>
              Thank you!
            </h4>
            <p className='max-w-[466px] mx-auto mt-4 text-lg text-secondary'>
              We&apos;ll check the listing to see if it
              violates our guidelines and take the necessary
              action to ensure a safe shopping experience
              for everyone. Thank you for helping us
              maintain a trusted community.
            </p>
          </div>

          <div className='border-t px-4 pt-5'>
            <Button
              className='w-full py-3 uppercase'
              onClick={onClose}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
