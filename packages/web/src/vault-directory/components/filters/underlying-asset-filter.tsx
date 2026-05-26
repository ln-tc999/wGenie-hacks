import { MultiSelect } from '@/components/ui/multiselect';

interface Props {
  value: string[];
  onChange: (assets: string[]) => void;
  options: string[];
  className?: string;
}

export const UnderlyingAssetFilter = ({ value, onChange, options, className }: Props) => {
  const assetOptions = options.map((asset) => ({
    value: asset,
    label: asset,
  }));

  const getTriggerText = (
    selectedCount: number,
    selectedItems: { value: string; label: string }[],
  ) => {
    if (selectedCount === 0) {
      return 'All assets';
    }
    if (selectedCount === 1 && selectedItems[0]) {
      return selectedItems[0].label;
    }
    return `${selectedCount} assets selected`;
  };

  return (
    <MultiSelect
      options={assetOptions}
      value={value}
      onChange={onChange}
      placeholder="All assets"
      searchPlaceholder="Search assets..."
      triggerText={getTriggerText}
      className={className}
    />
  );
};
