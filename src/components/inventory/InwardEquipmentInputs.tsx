'use client';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-provider';
import type { InwardDestination } from './inward-item-names';
import { fieldsFor, labels } from './inward-equipment-fields';

export default function InwardEquipmentInputs({ destination, values, onChange }: {
  destination: InwardDestination;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}) {
  const { users } = useAuth();
  return <>{fieldsFor(destination).map(key => {
    const update = (value: string) => onChange({ ...values, [key]: value });
    const mobile = destination.source === 'mobileSims';
    const value = values[key] ?? (key === 'status' ? (mobile ? 'Standby' : 'Idle') : '');
    let options: { id: string; name: string }[] | undefined;
    if (key === 'allottedTo' || key === 'allottedToUserId') options = users;
    if (key === 'status' || key === 'probeStatus' || key === 'cableStatus') {
      const statuses = key !== 'status' ? ['Good', 'Damaged', 'Not Applicable'] :
        mobile ? ['Active', 'Inactive', 'Returned', 'Standby'] : ['Idle', 'In Service', 'Damaged', 'Out of Service'];
      options = statuses.map(id => ({ id, name: id === 'In Service' ? 'In use' : id }));
    }
    return <label key={key} className="space-y-2 text-sm font-medium">
      <span>{labels[key]}</span>
      {options ? <select className="flex h-10 w-full rounded-md border bg-background px-3" value={value} onChange={e => update(e.target.value)}>
        <option value="">{key.startsWith('allotted') ? 'Unassigned' : 'Select'}</option>
        {value && !options.some(o => o.id === value) && <option value={value}>{value}</option>}
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select> : <Input type={key.endsWith('Date') ? 'date' : key === 'password' ? 'password' : key === 'certificateUrl' ? 'url' : 'text'}
        value={value} onChange={e => update(e.target.value)} />}
    </label>;
  })}</>;
}
