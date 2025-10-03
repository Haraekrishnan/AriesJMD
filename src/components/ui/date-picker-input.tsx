
'use client';

import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from './input';

interface DatePickerInputProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
}

export function DatePickerInput({ value, onChange, disabled }: DatePickerInputProps) {
  const [textValue, setTextValue] = React.useState(value ? format(value, 'dd-MM-yyyy') : '');

  React.useEffect(() => {
    setTextValue(value ? format(value, 'dd-MM-yyyy') : '');
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value;
    setTextValue(str);
    if (str.length === 0) {
      onChange(undefined);
    } else if (str.length === 10) {
      const parsedDate = parse(str, 'dd-MM-yyyy', new Date());
      if (isValid(parsedDate)) {
        onChange(parsedDate);
      }
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    onChange(date);
    if (date) {
        setTextValue(format(date, 'dd-MM-yyyy'));
    }
  };
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
    setTextValue('');
  };

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder="DD-MM-YYYY"
        value={textValue}
        onChange={handleInputChange}
        disabled={disabled}
        className="pr-10"
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={'ghost'}
            size="icon"
            className={cn('absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2', disabled && 'hidden')}
            disabled={disabled}
          >
            {value ? (
              <X className="h-4 w-4" onClick={handleClear} />
            ) : (
              <CalendarIcon className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
