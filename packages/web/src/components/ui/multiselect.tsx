import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { ChevronDownIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  triggerText?: (selectedCount: number, selectedItems: Option[]) => string;
  className?: string;
  maxDisplayItems?: number;
}

export const MultiSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Select items',
  searchPlaceholder = 'Search...',
  triggerText,
  className,
  maxDisplayItems = 3,
}: Props) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleToggleItem = (itemValue: string) => {
    const newValue = value.includes(itemValue)
      ? value.filter((v) => v !== itemValue)
      : [...value, itemValue];
    onChange(newValue);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleSelectAll = () => {
    const allValues = filteredOptions.map((option) => option.value);
    onChange(allValues);
  };

  const selectedItems = options.filter((option) =>
    value.includes(option.value),
  );
  const selectedCount = value.length;

  const getTriggerText = () => {
    if (triggerText) {
      return triggerText(selectedCount, selectedItems);
    }

    if (selectedCount === 0) {
      return placeholder;
    }

    if (selectedCount === 1 && selectedItems[0]) {
      return selectedItems[0].label;
    }

    return `${selectedCount} items selected`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-full justify-between text-left', className)}
        >
          <span className="truncate">{getTriggerText()}</span>
          <ChevronDownIcon className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <div className="flex justify-between px-2 py-1.5 border-b">
            <button
              onClick={handleSelectAll}
              className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
              disabled={filteredOptions.length === 0}
            >
              Select all
            </button>
            <button
              onClick={handleClearAll}
              className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              disabled={selectedCount === 0}
            >
              Clear all
            </button>
          </div>
          <CommandList className="max-h-48">
            <CommandEmpty>No items found</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleToggleItem(option.value)}
                >
                  <Checkbox
                    checked={value.includes(option.value)}
                    className="mr-2"
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>

        {/* Selected Items Display */}
        {selectedCount > 0 && (
          <div className="p-2 border-t bg-muted">
            <div className="flex flex-wrap gap-1">
              {selectedItems.slice(0, maxDisplayItems).map((item) => (
                <Badge key={item.value} variant="secondary" className="gap-1">
                  {item.label}
                  <button
                    onClick={() => handleToggleItem(item.value)}
                    className="hover:text-foreground/80"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {selectedCount > maxDisplayItems && (
                <span className="text-xs text-muted-foreground">
                  +{selectedCount - maxDisplayItems} more
                </span>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
