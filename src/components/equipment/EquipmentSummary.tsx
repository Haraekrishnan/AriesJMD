
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { HardHat, Scan, Layers, Camera, Wind, Smartphone, Laptop, Sparkles } from 'lucide-react';
import StatCard from '../dashboard/stat-card';

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
  } = useAppContext();

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
    const mobileStatus = calculateStatus(mobileSims);
    const weldingStatus = calculateStatus(weldingMachines || []);

    return [
      { name: 'UT Machines', count: utMachines.length, icon: Scan, description: `${utStatus.active} active, ${utStatus.idle} idle` },
      { name: 'DFT Machines', count: dftMachines.length, icon: Layers, description: `${dftStatus.active} active, ${dftStatus.idle} idle` },
      { name: 'Welding Machines', count: (weldingMachines || []).length, icon: Sparkles, description: `${weldingStatus.active} active, ${weldingStatus.idle} idle` },
      { name: 'Digital Cameras', count: digitalCameras.length, icon: Camera, description: `${cameraStatus.active} active, ${cameraStatus.idle} idle` },
      { name: 'Anemometers', count: anemometers.length, icon: Wind, description: `${anemometerStatus.active} active, ${anemometerStatus.idle} idle` },
      { name: 'Mobiles & SIMs', count: mobileSims.length, icon: Smartphone, description: `${mobileStatus.active} active, ${mobileStatus.idle} inactive` },
      { name: 'Laptops & Desktops', count: laptopsDesktops.length, icon: Laptop, description: `Total ${laptopsDesktops.length}` },
      { name: 'Other Equipment', count: otherEquipments.length, icon: HardHat, description: `Total ${otherEquipments.length}` },
    ];
  }, [utMachines, dftMachines, digitalCameras, anemometers, mobileSims, laptopsDesktops, otherEquipments, weldingMachines]);

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {equipmentCounts.map(item => (
            <StatCard 
                key={item.name}
                title={item.name}
                value={item.count}
                icon={item.icon}
                description={item.description}
            />
        ))}
    </div>
  );
}
