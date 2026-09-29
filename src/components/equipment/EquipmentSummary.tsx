
'use client';
import { useMemo } from 'react';
import { useInventory } from '@/contexts/inventory-provider';
import { HardHat, Scan, Layers, Camera, Wind, Smartphone, Laptop, Sparkles, Radio, CreditCard } from 'lucide-react';
import styles from './equipment.module.css';

export default function EquipmentSummary() {
  const { 
    utMachines,
    dftMachines,
    digitalCameras,
    anemometers,
    mobileSims,
    laptopsDesktops,
    otherEquipments,
    weldingMachines,
    walkieTalkies,
  } = useInventory();

  const equipmentCounts = useMemo(() => {
    const calculateStatus = (items: { status: string }[]) => {
      const active = items.filter(item => item.status === 'In Service' || item.status === 'Active').length;
      const idle = items.length - active;
      return { active, idle };
    };

    const utStatus = calculateStatus(utMachines);
    const dftStatus = calculateStatus(dftMachines);
    const cameraStatus = calculateStatus(digitalCameras);
    const anemometerStatus = calculateStatus(anemometers);
    const weldingStatus = calculateStatus(weldingMachines || []);
    const walkieTalkieStatus = calculateStatus(walkieTalkies || []);
    
    const mobiles = mobileSims.filter(item => item.type === 'Mobile' || item.type === 'Mobile with SIM');
    const sims = mobileSims.filter(item => item.type === 'SIM');
    const mobileStatus = calculateStatus(mobiles);
    const simStatus = calculateStatus(sims);


    return [
      { name: 'UT Machines', count: utMachines.length, icon: Scan, active: utStatus.active, description: `${utStatus.active} active, ${utStatus.idle} idle` },
      { name: 'DFT Machines', count: dftMachines.length, icon: Layers, active: dftStatus.active, description: `${dftStatus.active} active, ${dftStatus.idle} idle` },
      { name: 'Welding Machines', count: (weldingMachines || []).length, icon: Sparkles, active: weldingStatus.active, description: `${weldingStatus.active} active, ${weldingStatus.idle} idle` },
      { name: 'Walkie Talkies', count: (walkieTalkies || []).length, icon: Radio, active: walkieTalkieStatus.active, description: `${walkieTalkieStatus.active} active, ${walkieTalkieStatus.idle} idle` },
      { name: 'Digital Cameras', count: digitalCameras.length, icon: Camera, active: cameraStatus.active, description: `${cameraStatus.active} active, ${cameraStatus.idle} idle` },
      { name: 'Anemometers', count: anemometers.length, icon: Wind, active: anemometerStatus.active, description: `${anemometerStatus.active} active, ${anemometerStatus.idle} idle` },
      { name: 'Mobiles', count: mobiles.length, icon: Smartphone, active: mobileStatus.active, description: `${mobileStatus.active} active, ${mobileStatus.idle} inactive` },
      { name: 'SIMs', count: sims.length, icon: CreditCard, active: simStatus.active, description: `${simStatus.active} active, ${simStatus.idle} inactive` },
      { name: 'Laptops & Desktops', count: laptopsDesktops.length, icon: Laptop, description: `Total ${laptopsDesktops.length}` },
      { name: 'Other Equipment', count: otherEquipments.length, icon: HardHat, description: `Total ${otherEquipments.length}` },
    ];
  }, [utMachines, dftMachines, digitalCameras, anemometers, mobileSims, laptopsDesktops, otherEquipments, weldingMachines, walkieTalkies]);

  return <section className={styles.metrics} aria-label="Equipment totals by record type">{equipmentCounts.map((item,index)=>{
    const Icon=item.icon;const active='active' in item ? item.active : undefined;
    const percentage=active===undefined?null:(item.count?Math.round(active/item.count*100):0);
    return <article key={item.name} className={styles.metric} data-tone={index%5}><span className={styles.icon}><Icon aria-hidden="true"/></span><div><h2>{item.name}</h2><strong>{item.count.toLocaleString()}</strong><p>{item.description}</p>{percentage!==null&&<div className={styles.meter}><span><i style={{width:percentage+'%'}}/></span><small>{percentage}% active</small></div>}</div></article>;
  })}</section>;
}
