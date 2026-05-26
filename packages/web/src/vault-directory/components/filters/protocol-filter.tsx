import { MultiSelect } from '@/components/ui/multiselect';

interface Props {
  value: string[];
  onChange: (protocols: string[]) => void;
  options: string[];
  className?: string;
}

export const ProtocolFilter = ({ value, onChange, options, className }: Props) => {
  const protocolOptions = options.map((protocol) => ({
    value: protocol,
    label: protocol,
  }));

  const getTriggerText = (
    selectedCount: number,
    selectedItems: { value: string; label: string }[],
  ) => {
    if (selectedCount === 0) return 'All protocols';
    if (selectedCount === 1 && selectedItems[0]) return selectedItems[0].label;
    return `${selectedCount} protocols selected`;
  };

  return (
    <MultiSelect
      options={protocolOptions}
      value={value}
      onChange={onChange}
      placeholder="All protocols"
      searchPlaceholder="Search protocols..."
      triggerText={getTriggerText}
      className={className}
    />
  );
};
