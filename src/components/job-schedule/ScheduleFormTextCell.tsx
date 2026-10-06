'use client';

import { memo } from 'react';
import { useController, type Control, type FieldValues, type FieldPath } from 'react-hook-form';
import ScheduleTextCell from './ScheduleTextCell';

// Subscribe within the cell so a keystroke cannot redraw the whole worksheet.
function ScheduleFormTextCell<T extends FieldValues>({ control, name, ...props }: {
  control: Control<T>;
  name: FieldPath<T>;
  'aria-label': string;
}) {
  const { field } = useController({ control, name });
  return <ScheduleTextCell {...props} {...field} value={field.value ?? ''} />;
}
export default memo(ScheduleFormTextCell) as typeof ScheduleFormTextCell;
