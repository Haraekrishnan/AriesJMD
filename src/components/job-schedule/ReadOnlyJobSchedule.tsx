'use client';
import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import type { JobSchedule } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { CheckCircle2 } from 'lucide-react';
import { scheduleColumns } from './schedule-worksheet';
import styles from './schedule-worksheet.module.css';

export default function ReadOnlyJobSchedule({ schedule }: { schedule?: JobSchedule }) {
  const { manpowerProfiles, vehicles, projects, users } = useAppContext();
  const [search, setSearch] = useState('');
  const personName = (id: string) => manpowerProfiles.find(p => p.id === id)?.name || users.find(u => u.id === id)?.name || id;
  const items = schedule?.items || [];
  const visible = items.map((item, index) => ({ item, index })).filter(({ item }) => (item.manpowerIds || []).some(id => personName(id).toLowerCase().includes(search.trim().toLowerCase())) || !search.trim());
  const count = new Set(items.flatMap(item => item.manpowerIds || [])).size;
  return <>
    <div className={styles.searchBar}><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find assigned person..." aria-label="Find assigned person" /></div>
    <div className={styles.gridScroll} role="region" aria-label="Saved job schedule" tabIndex={0}>
      <table className={styles.sheet}>
        <colgroup><col className={styles.numberCol} /><col className={styles.personCol} />{scheduleColumns.slice(1).map(c => <col key={c} />)}</colgroup>
        <thead><tr><th scope="col">#</th>{scheduleColumns.map(c => <th scope="col" key={c}>{c}</th>)}</tr></thead>
        <tbody>{visible.map(({ item, index }) => <tr key={item.id}>
          <td>{index + 1}</td>
          <td><ol className={styles.names}>{(item.manpowerIds || []).map((id, n) => <li key={id}><span className={styles.personNumber}>{n + 1}</span><span>{personName(id)}</span></li>)}</ol></td>
          <td>{item.jobType || '—'}</td><td>{item.jobNo || '—'}</td><td>{item.projectVesselName || '—'}</td>
          <td>{projects.find(p => p.id === item.projectId)?.name || item.projectId || '—'}</td><td>{item.location || '—'}</td>
          <td>{item.reportingTime || '—'}</td><td>{item.clientContact || '—'}</td>
          <td>{vehicles.find(v => v.id === item.vehicleId)?.vehicleNumber || (item.vehicleId && item.vehicleId !== 'none' ? item.vehicleId : 'N/A')}</td><td className={styles.remarks}>{item.remarks || '—'}</td>
        </tr>)}{!visible.length && <tr><td colSpan={11} className={styles.empty}>{items.length ? 'No assigned personnel match your search.' : 'No job entries in this schedule.'}</td></tr>}</tbody>
      </table>
    </div>
    <div className={styles.footer}><span>{items.length} job rows · {count} personnel assigned{search && ` · ${visible.length} matching rows`}</span><span className={styles.saved}><CheckCircle2 size={14} />All changes saved</span></div>
  </>;
}
