
"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "./label";

interface TransferListOption {
  value: string;
  label: React.ReactNode;
}

interface TransferListProps {
  options: TransferListOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  availableTitle?: string;
  selectedTitle?: string;
}

export function TransferList({
  options,
  selected,
  onChange,
  availableTitle = "Available",
  selectedTitle = "Selected",
}: TransferListProps) {
  const [checked, setChecked] = React.useState<string[]>([]);
  
  const availableOptions = options.filter(option => !selected.includes(option.value));

  const handleToggle = (value: string) => () => {
    const currentIndex = checked.indexOf(value);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
  };

  const handleMoveSelected = () => {
    const itemsToMove = checked.filter(c => availableOptions.some(o => o.value === c));
    onChange(selected.concat(itemsToMove));
    setChecked([]);
  };

  const handleMoveAvailable = () => {
    const itemsToMove = checked.filter(c => selected.includes(c));
    onChange(selected.filter(value => !itemsToMove.includes(value)));
    setChecked([]);
  };

  const CustomList = ({ title, items }: { title: string, items: TransferListOption[] }) => (
    <Card className="flex-1">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-base">{title} ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-48">
          {items.length === 0 ? (
             <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No items
            </div>
          ) : (
             items.map(option => (
                <Label key={option.value} className="flex items-center gap-2 p-3 border-b cursor-pointer hover:bg-muted/50 font-normal">
                    <Checkbox
                      checked={checked.indexOf(option.value) !== -1}
                      onCheckedChange={handleToggle(option.value)}
                    />
                    {option.label}
                </Label>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
      <CustomList title={availableTitle} items={availableOptions} />
      <div className="flex flex-col gap-2">
        <Button size="icon" variant="outline" onClick={handleMoveSelected} disabled={checked.filter(c => availableOptions.some(o => o.value === c)).length === 0}>
          <ArrowRight />
        </Button>
        <Button size="icon" variant="outline" onClick={handleMoveAvailable} disabled={checked.filter(c => selected.includes(c)).length === 0}>
          <ArrowLeft />
        </Button>
      </div>
      <CustomList title={selectedTitle} items={options.filter(o => selected.includes(o.value))} />
    </div>
  );
}
