import { MultiSelect } from '@/components/ui/multiselect';

interface ChainOption {
  chainId: number;
  name: string;
}

interface Props {
  value: number[];
  onChange: (chains: number[]) => void;
  options: ChainOption[];
  className?: string;
}

export const ChainFilter = ({ value, onChange, options, className }: Props) => {
  const chainOptions = options.map((chain) => ({
    value: chain.chainId.toString(),
    label: chain.name,
  }));

  const handleChange = (selected: string[]) => {
    onChange(selected.map(Number));
  };

  const getTriggerText = (
    selectedCount: number,
    selectedItems: { value: string; label: string }[],
  ) => {
    if (selectedCount === 0) return 'All chains';
    if (selectedCount === 1 && selectedItems[0]) return selectedItems[0].label;
    return `${selectedCount} chains selected`;
  };

  return (
    <MultiSelect
      options={chainOptions}
      value={value.map(String)}
      onChange={handleChange}
      placeholder="All chains"
      searchPlaceholder="Search chains..."
      triggerText={getTriggerText}
      className={className}
    />
  );
};
