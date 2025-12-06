

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
  const [textValue, setTextValue] = React.useState('');
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  React.useEffect(() => {
    if (value && isValid(value)) {
      setTextValue(format(value, 'dd-MM-yyyy'));
    } else {
      setTextValue('');
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value;
    setTextValue(str);

    const formats = ['dd-MM-yyyy', 'dd/MM/yyyy', 'd-M-yy', 'd/M/yy'];
    let parsedDate: Date | undefined;

    for (const fmt of formats) {
      const parsed = parse(str, fmt, new Date());
      // Check if parsing was successful and if the formatted date matches the input
      // This helps avoid partial matches like '12' becoming a valid date
      if (isValid(parsed) && format(parsed, fmt).padStart(fmt.length, '0') === str.padStart(fmt.length, '0')) {
        parsedDate = parsed;
        break;
      }
    }
    
    if (parsedDate) {
      onChange(parsedDate);
    } else if (str === '') {
      onChange(undefined);
    }
  };

  const handleBlur = () => {
    // On blur, if the text input is invalid, format it back to the last valid `value`
    if (value && isValid(value)) {
      setTextValue(format(value, 'dd-MM-yyyy'));
    } else {
        if (textValue !== '') {
            onChange(undefined);
            setTextValue('');
        }
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    onChange(date);
    setTextValue(date ? format(date, 'dd-MM-yyyy') : '');
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
        onBlur={handleBlur}
        disabled={disabled}
        className="pr-16"
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2 h-8 flex items-center">
        {value && !disabled && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear}>
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
        )}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
            <Button
                type="button"
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
      </div>
    </div>
  );
}
