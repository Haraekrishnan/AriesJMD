'use client';
import { useState } from 'react';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { EquipmentGroup } from './EquipmentCategoryRegister';
import styles from './equipment.module.css';
export interface CategoryEquipmentRow { key:string; item:any; g:EquipmentGroup; }
export default function UnifiedEquipmentTable({rows, categoryName}: {rows:CategoryEquipmentRow[]; categoryName:string}) {
  const {projects} = useGeneral();
  const [detailKey,setDetailKey] = useState<string|null>(null);
  const detail=rows.find(row=>row.key===detailKey);
  const name=(item:any)=>item.equipmentName||item.machineName||item.name||item.model||categoryName;
  return <>
    <div className={styles.tableGroup}><table className={styles.unifiedTable} aria-label={categoryName+' equipment'}><thead><tr>{['Sl. No.','Equipment Name','Category','Serial Number','Aries ID','Project / Location','Status','Remarks','Actions'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>
      {rows.map(({key,item},index)=><tr key={key}><td>{index+1}</td><td>{name(item)}</td><td>{categoryName}</td><td>{item.serialNumber||item.serialNo||item.imei||item.simNumber||'—'}</td><td>{item.ariesId||'—'}</td><td>{projects.find(project=>project.id===item.projectId)?.name||item.location||'—'}</td><td>{item.status||'—'}</td><td>{item.remarks||'—'}</td><td><Button variant="outline" size="sm" onClick={()=>setDetailKey(key)}>Details &amp; actions</Button></td></tr>)}
    </tbody></table></div>
    <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetailKey(null);}}><DialogContent className="max-w-7xl max-h-[90vh] overflow-auto"><DialogHeader><DialogTitle>{categoryName} — {detail?name(detail.item):'Equipment'}</DialogTitle><DialogDescription>Equipment details, certificates and available actions.</DialogDescription></DialogHeader>{detail&&detail.g.render([detail.item])}</DialogContent></Dialog>
  </>;
}
