'use client';

import { useId, useState } from 'react';
import { ALL_PERMISSIONS } from '@/lib/types';
import { Input } from '@/components/ui/input';
import styles from './account.module.css';

const permissionName = (name: string) => name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
export default function PermissionPicker({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const [search, setSearch] = useState('');
  const id = useId();
  const filtered = ALL_PERMISSIONS.filter(p => permissionName(p).toLowerCase().includes(search.trim().toLowerCase()));
  return <div className={styles.permissions}>
    <Input aria-label="Search permissions" placeholder="Search permissions, e.g. job schedule" value={search} onChange={e => setSearch(e.target.value)} />
    <div className={styles.permissionSummary}>{value.length} selected · {filtered.length} shown</div>
    <div className={styles.permissionList} role="group" aria-label="Role permissions">
      {filtered.map(permission => <label key={permission} htmlFor={`${id}-${permission}`} className={styles.permissionOption}>
        <input type="checkbox" id={`${id}-${permission}`} checked={value.includes(permission)} onChange={e => onChange(e.target.checked ? [...new Set([...value, permission])] : value.filter(p => p !== permission))} />
        <span>{permissionName(permission)}
          {permission === 'view_job_schedule' && <small>View schedules for any date and download Excel / PDF. Does not allow creating or editing.</small>}
          {permission === 'manage_job_schedule' && <small>Create, edit, delete, lock and unlock schedules. Also allows viewing and downloads.</small>}
        </span>
      </label>)}
      {!filtered.length && <p className="p-4 text-sm text-muted-foreground">No permissions match your search.</p>}
    </div>
    {value.includes('view_job_schedule') && value.includes('manage_job_schedule') && <p className="text-xs text-amber-700">Manage Job Schedule is also selected, so this role can edit. Uncheck it for view-only access.</p>}
  </div>;
}
