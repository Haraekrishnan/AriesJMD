
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
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  React.useEffect(() => {
    setTextValue(value ? format(value, 'dd-MM-yyyy') : '');
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value;
    setTextValue(str);
    if (str.length === 0) {
      onChange(undefined);
    } else {
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
    } else {
        setTextValue('');
    }
    setIsCalendarOpen(false);
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
        onBlur={() => setTextValue(value ? format(value, 'dd-MM-yyyy') : '')} // Revert on blur if invalid
        disabled={disabled}
        className="pr-10"
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center">
        {value && !disabled ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear}>
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
        ) : (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                <Button
                    variant={'ghost'}
                    size="icon"
                    className={cn('h-8 w-8', disabled && 'hidden')}
                    disabled={disabled}
                >
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
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
        )}
      </div>
    </div>
  );
}
