import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { NetFlowOption } from '@/vault-directory/vault-directory.types';

interface Props {
  value: NetFlowOption;
  onChange: (option: NetFlowOption) => void;
  className?: string;
}

export const NetFlowFilter = ({ value, onChange, className }: Props) => {
  const options: { value: NetFlowOption; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'positive', label: 'Positive' },
    { value: 'negative', label: 'Negative' },
  ];

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      onValueChange={(newValue) => {
        if (newValue) {
          onChange(newValue as NetFlowOption);
        }
      }}
      className={className ?? "w-full"}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="px-5"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};
