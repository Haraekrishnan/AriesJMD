'use client';
import { ReactNode, useState, useEffect, useRef } from 'react';
import { ref, runTransaction } from 'firebase/database';
import { rtdb } from '@/lib/rtdb';
import { useAuth } from '@/contexts/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { addEquipmentCategory, moveEquipmentCategories, renameEquipmentCategory, deleteEquipmentCategory, equipmentKey } from './equipment-categories';
import { useEquipmentOrganization } from './use-equipment-organization';
import styles from './equipment.module.css';
export interface EquipmentGroup { id: string; source: string; name: string; items: any[]; searchText?: (item: any) => string; render: (items: any[]) => ReactNode; }
export default function EquipmentCategoryRegister({groups, activeTab, onTabChange}: {groups: EquipmentGroup[]; activeTab: string; onTabChange: (id: string) => void}) {
  const {can, user} = useAuth();
  const {toast} = useToast();
  const {state, ready, error} = useEquipmentOrganization();
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => { tabsRef.current?.querySelector<HTMLElement>('[aria-selected=true]')?.scrollIntoView?.({block:'nearest',inline:'nearest'}); }, [activeTab]);
  const [name,setName] = useState('');
  const [search,setSearch] = useState('');
  const [creating,setCreating] = useState(false);
  const [moving,setMoving] = useState(false);
  const [selected,setSelected] = useState<string[]>([]);
  const [destination,setDestination] = useState('');
  const isAdmin = user?.role === 'Admin';
  const [editing,setEditing] = useState<{id:string; name:string} | null>(null);
  const [editName,setEditName] = useState('');
  const [deleting,setDeleting] = useState<{id:string; name:string} | null>(null);
  const [deleteStep,setDeleteStep] = useState(1);
  const [deleteText,setDeleteText] = useState('');
  const [busy,setBusy] = useState(false);
  const categories = [...groups.map(g=>({id:g.id,name:g.name})),...Object.values(state.categories || {})];
  const category = categories.find(c=>c.id===activeTab);
  const assigned = (g: EquipmentGroup, item: any) => {
    const id = state.assignments?.[equipmentKey(g.source,item.id)];
    return id && categories.some(c=>c.id===id) ? id : g.id;
  };
  const matches = (item: any, g: EquipmentGroup) => (g.searchText?.(item) || '').toLowerCase().includes(search.toLowerCase()) || Object.values(item).some(value => typeof value==='string' && value.toLowerCase().includes(search.toLowerCase()));
  const visible = groups.flatMap(g=>g.items.filter(item=>assigned(g,item)===activeTab && matches(item,g)).map(item=>({g,item,key:equipmentKey(g.source,item.id)})));
  const unique = [...new Map(visible.map(row=>[row.key,row])).values()];
  const selectedVisible = selected.filter(key=>unique.some(row=>row.key===key));
  const fail = (error: unknown) => toast({variant:'destructive',title:'Equipment categories',description:error instanceof Error?error.message:'Unable to save. Please retry.'});
  async function createCategory() {
    if (!user || !can.manage_equipments || busy) return;
    setBusy(true);
    try {
      const id='custom-'+crypto.randomUUID();
      const result=await runTransaction(ref(rtdb,'equipmentOrganization'),current=>addEquipmentCategory(current,{id,name},groups.map(g=>g.name)),{applyLocally:false});
      if (!result.committed) throw new Error('Category was not saved.');
      setName('');setCreating(false);setSearch('');setSelected([]);onTabChange(id);
      toast({title:'Category created'});
    } catch(error) { fail(error); } finally { setBusy(false); }
  }
  async function moveSelected() {
    if (!user || !can.manage_equipments || busy) return;
    setBusy(true);
    try {
      const result=await runTransaction(ref(rtdb,'equipmentOrganization'),current=>moveEquipmentCategories(current,selectedVisible,destination,groups.map(g=>g.id)),{applyLocally:false});
      if (!result.committed) throw new Error('Equipment was not moved.');
      toast({title:`Moved ${selectedVisible.length} equipment item(s)`});setMoving(false);setSelected([]);setSearch('');onTabChange(destination);
    } catch(error) { fail(error); } finally { setBusy(false); }
  }
  async function saveCategoryName() {
    if (!isAdmin || !editing || busy) return;
    setBusy(true);
    try {
      const result = await runTransaction(ref(rtdb,'equipmentOrganization'),current=>renameEquipmentCategory(current,editing.id,editName,groups.map(g=>g.name)),{applyLocally:false});
      if (!result.committed) throw new Error('Category was not saved.');
      setEditing(null);toast({title:'Category renamed'});
    } catch(error) { fail(error); } finally { setBusy(false); }
  }
  async function confirmDeleteCategory() {
    if (!isAdmin || !deleting || deleteStep!==2 || deleteText!=='DELETE' || busy) return;
    setBusy(true);
    try {
      const result = await runTransaction(ref(rtdb,'equipmentOrganization'),current=>deleteEquipmentCategory(current,deleting.id,deleting.name),{applyLocally:false});
      if (!result.committed) throw new Error('Category was not deleted.');
      setDeleting(null);setSelected([]);setSearch('');setMoving(false);
      if(activeTab===deleting.id) onTabChange(groups.find(g=>g.id==='general-equipments')?.id || groups[0].id);
      toast({title:'Category deleted',description:'Equipment records are preserved in their original equipment types.'});
    } catch(error) { fail(error); } finally { setBusy(false); }
  }
  const changeTab=(id:string)=>{onTabChange(id);setSelected([]);setSearch('');setDestination('');};
  const renderedKeys = new Set<string>();
  return <section className={styles.register}>
    <div className={styles.categoryTools}>{can.manage_equipments && <><Button variant="outline" disabled={!ready||!!error} onClick={()=>setCreating(true)}>+ Add category</Button><Button variant="outline" disabled={!ready||!!error} onClick={()=>{setMoving(!moving);setSelected([]);}}>Select &amp; move equipment</Button></>}</div>
    {isAdmin && state.categories?.[activeTab] && <div className={styles.categoryTools}>
      <Button variant="outline" disabled={busy||!!error} onClick={()=>{setEditing(state.categories![activeTab]);setEditName(state.categories![activeTab].name);}}>Edit category</Button>
      <Button variant="destructive" disabled={busy||!!error} onClick={()=>{setDeleting(state.categories![activeTab]);setDeleteStep(1);setDeleteText('');}}>Delete category</Button>
    </div>}
    {error && <p role="alert">Unable to load equipment categories: {error}. Check the database rules before using category actions.</p>}
    <div ref={tabsRef} className={styles.tabs} role="tablist" aria-label="Equipment categories">{categories.map(c=><button disabled={busy} key={c.id} role="tab" aria-selected={activeTab===c.id} onClick={()=>changeTab(c.id)}>{c.name}</button>)}</div>
    <div className={styles.registerHeader}><div><h2>{category?.name || 'Equipment'} <small>{unique.length}</small></h2><p>Equipment records, documents and actions.</p></div><input aria-label="Search equipment" placeholder="Search name, serial number or asset ID…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    {!ready ? <p>Loading equipment categories…</p> : <>
      {moving && can.manage_equipments && <div className={styles.movePanel}>
        <div className={styles.categoryTools}><strong>{selectedVisible.length} selected</strong><select aria-label="Destination category" value={destination} onChange={e=>setDestination(e.target.value)}><option value="">Move to category…</option>{categories.filter(c=>c.id!==activeTab).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select><Button disabled={busy||!destination||!selectedVisible.length||!!error} onClick={moveSelected}>{busy?'Moving…':'Move selected'}</Button><Button variant="outline" disabled={busy} onClick={()=>{setMoving(false);setSelected([]);}}>Cancel</Button></div>
        <p>This changes category only. Equipment details, documents and usage history stay with each record.</p>
        <label><input type="checkbox" disabled={busy||!unique.length} checked={!!unique.length&&selectedVisible.length===unique.length} onChange={e=>setSelected(e.target.checked?unique.map(r=>r.key):[])}/> Select all shown ({unique.length})</label>
        <div className={styles.selectionList}>{unique.map(({key,item,g})=><label key={key}><input type="checkbox" disabled={busy} checked={selected.includes(key)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,key]:prev.filter(k=>k!==key))}/><strong>{item.equipmentName||item.name||item.machineName||item.ariesId||item.id}</strong><span>{item.serialNumber||item.serialNo||item.imei||'—'} · {g.name}</span></label>)}</div>
      </div>}
      {!unique.length && <p className={styles.empty}>No equipment in this category matches the filters. Add equipment or move items here from another category.</p>}
      {groups.map(g=>{const items=g.items.filter(item=>{const key=equipmentKey(g.source,item.id); if (assigned(g,item)!==activeTab||!matches(item,g)||renderedKeys.has(key)) return false; renderedKeys.add(key); return true;});return items.length?<div key={g.id} className={styles.tableGroup}>{activeTab!==g.id&&<p className={styles.originalType}>Record type: {g.name}</p>}{g.render(items)}</div>:null;})}
    </>}
    <Dialog open={!!editing && isAdmin} onOpenChange={open=>{if(!busy&&!open)setEditing(null);}}><DialogContent><DialogHeader><DialogTitle>Edit equipment category</DialogTitle><DialogDescription>Rename the category. Equipment and assignments remain unchanged.</DialogDescription></DialogHeader><form onSubmit={e=>{e.preventDefault();saveCategoryName();}}><label>Category name<input aria-label="Edit category name" required maxLength={60} value={editName} onChange={e=>setEditName(e.target.value)} className={styles.nameInput}/></label><Button type="submit" disabled={busy||!editName.trim()}>Save category name</Button></form></DialogContent></Dialog>
    <Dialog open={!!deleting && isAdmin} onOpenChange={open=>{if(!busy&&!open)setDeleting(null);}}><DialogContent><DialogHeader><DialogTitle>{deleteStep===1?'Delete category — confirmation 1 of 2':'Delete category — final confirmation'}</DialogTitle><DialogDescription>Delete {deleting?.name}? All equipment assigned here will return to its original equipment type, including items hidden by filters. No equipment, certificates or history will be deleted.</DialogDescription></DialogHeader>
      <p>{Object.values(state.assignments || {}).filter(id=>id===deleting?.id).length} category assignments will be removed.</p>
      {deleteStep===2 && <label>Type DELETE to confirm<input aria-label="Type DELETE to confirm" autoComplete="off" value={deleteText} onChange={e=>setDeleteText(e.target.value)} className={styles.nameInput}/></label>}
      <div className={styles.categoryTools}><Button variant="outline" disabled={busy} onClick={()=>setDeleting(null)}>Cancel deletion</Button>{deleteStep===1?<Button variant="destructive" onClick={()=>setDeleteStep(2)}>Continue to final confirmation</Button>:<Button variant="destructive" disabled={busy||deleteText!=='DELETE'} onClick={confirmDeleteCategory}>{busy?'Deleting…':'Permanently delete category'}</Button>}</div>
    </DialogContent></Dialog>
    <Dialog open={creating} onOpenChange={open=>{if(!busy)setCreating(open);}}><DialogContent><DialogHeader><DialogTitle>Add equipment category</DialogTitle><DialogDescription>Create a category such as TV or Fridge.</DialogDescription></DialogHeader><form onSubmit={e=>{e.preventDefault();createCategory();}}><label>Category name<input autoFocus required maxLength={60} value={name} onChange={e=>setName(e.target.value)} className={styles.nameInput}/></label><Button disabled={busy||!name.trim()} type="submit">{busy?'Saving…':'Create category'}</Button></form></DialogContent></Dialog>
  </section>;
}
