'use client';
import { equipmentStatusLabel } from '@/components/equipment/equipment-status-label';
import { useState } from 'react';
import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { EquipmentGroup } from './EquipmentCategoryRegister';
import styles from './equipment.module.css';
export interface CategoryEquipmentRow { key:string; item:any; g:EquipmentGroup; }
export default function UnifiedEquipmentTable({rows, categoryName, showCalibration=false, offset=0}: {rows:CategoryEquipmentRow[]; categoryName:string; showCalibration?:boolean; offset?:number}) {
  const {projects} = useGeneral();
  const [detailKey,setDetailKey] = useState<string|null>(null);
  const detail=rows.find(row=>row.key===detailKey);
  const name=(item:any)=>item.equipmentName || item.machineName ||
    [...new Set([item.make, item.model].filter(value => value && value !== categoryName))].join(' ') ||
    item.simProvider || item.name || categoryName;
  const calibrationCell = (item:any) => {
    const raw = item.calibrationDueDate;
    if (!raw) return <span className="text-muted-foreground">Not entered</span>;
    const date = parseISO(String(raw));
    if (!isValid(date)) return <span className="text-destructive">Invalid date</span>;
    const days = differenceInCalendarDays(date, new Date());
    const label = days < 0 ? 'Overdue' : days === 0 ? 'Due today' : days <= 30 ? 'Due soon' : '';
    return <div className="whitespace-nowrap"><span>{format(date, 'dd MMM yyyy')}</span>{label && <span className={days < 0 ? 'block text-xs font-medium text-destructive' : 'block text-xs font-medium text-amber-700'}>{label}</span>}</div>;
  };
  return <>
    <div className={styles.tableGroup}><table className={styles.unifiedTable} aria-label={categoryName+' equipment'}><thead><tr>{['Sl. No.','Equipment','Serial Number','Aries ID','Project / Location',...(showCalibration ? ['Calibration due'] : []),'Status','Remarks','Actions'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>
      {rows.map(({key,item},index)=><tr key={key}><td>{offset+index+1}</td><td>{name(item)}</td><td>{item.serialNumber||item.serialNo||item.imei||item.simNumber||'—'}</td><td>{item.ariesId||'—'}</td><td>{projects.find(project=>project.id===item.projectId)?.name||item.location||'—'}</td>{showCalibration && <td>{calibrationCell(item)}</td>}<td><span className={styles.equipmentStatus} data-status={item.status}>{equipmentStatusLabel(item.status)}</span></td><td>{item.remarks||'—'}</td><td><Button variant="outline" size="sm" onClick={()=>setDetailKey(key)}>Details &amp; actions</Button></td></tr>)}
    </tbody></table></div>
    <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetailKey(null);}}><DialogContent className="max-w-7xl max-h-[90vh] overflow-auto"><DialogHeader><DialogTitle>{categoryName} — {detail?name(detail.item):'Equipment'}</DialogTitle><DialogDescription>Equipment details, certificates and available actions.</DialogDescription></DialogHeader>{detail&&detail.g.render([detail.item])}</DialogContent></Dialog>
  </>;
}
