
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { HardHat, Scan, Layers, Camera, Wind, Smartphone, Laptop } from 'lucide-react';
import StatCard from '../dashboard/stat-card';

export default function EquipmentSummary() {
  const { 
    utMachines,
    dftMachines,
    digitalCameras,
    anemometers,
    mobileSims,
    laptopsDesktops,
    otherEquipments
  } = useAppContext();

  const equipmentCounts = useMemo(() => {
    return [
      { name: 'UT Machines', count: utMachines.length, icon: Scan },
      { name: 'DFT Machines', count: dftMachines.length, icon: Layers },
      { name: 'Digital Cameras', count: digitalCameras.length, icon: Camera },
      { name: 'Anemometers', count: anemometers.length, icon: Wind },
      { name: 'Mobiles & SIMs', count: mobileSims.length, icon: Smartphone },
      { name: 'Laptops & Desktops', count: laptopsDesktops.length, icon: Laptop },
      { name: 'Other Equipment', count: otherEquipments.length, icon: HardHat },
    ];
  }, [utMachines, dftMachines, digitalCameras, anemometers, mobileSims, laptopsDesktops, otherEquipments]);

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {equipmentCounts.map(item => (
            <StatCard 
                key={item.name}
                title={item.name}
                value={item.count}
                icon={item.icon}
                description={`Total ${item.name}`}
            />
        ))}
    </div>
  );
}
