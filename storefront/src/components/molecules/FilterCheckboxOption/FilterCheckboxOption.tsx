import { Checkbox } from '@/components/atoms';
import { cn } from '@/lib/utils';

export const FilterCheckboxOption = ({
  label,
  amount,
  checked = false,
  onCheck = () => null,
  disabled = false,
}: {
  label: string;
  amount?: number;
  checked?: boolean;
  onCheck?: (option: string) => void;
  disabled?: boolean;
}) => {
  return (
    <label
      className={cn(
        'flex gap-4 items-center cursor-pointer',
        disabled && '!cursor-default'
      )}
      onClick={(e) => {
        // Prevent the label from forwarding a synthetic click to the inner
        // <input type="checkbox">, which would bubble back up and fire this
        // handler a second time — causing toggle → un-toggle = no net change.
        e.preventDefault()
        if (!disabled) onCheck(label)
      }}
    >
      <Checkbox checked={checked} disabled={disabled} />
      <p
        className={cn(
          'label-md !font-normal',
          checked && '!font-semibold',
          disabled && 'text-disabled'
        )}
      >
        {label}{' '}
        {amount && (
          <span className='label-sm !font-light'>
            ({amount})
          </span>
        )}
      </p>
    </label>
  );
};
