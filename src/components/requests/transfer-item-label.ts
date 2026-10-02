import { transferItemCollections } from './transfer-item-types';
import type { EquipmentOrganization } from '@/components/equipment/equipment-categories';
const categories = [
  {
    "id": "ut-machines",
    "source": "utMachines",
    "name": "UT Machines"
  },
  {
    "id": "dft-machines",
    "source": "dftMachines",
    "name": "DFT Machines"
  },
  {
    "id": "welding-machines",
    "source": "weldingMachines",
    "name": "Welding Machines"
  },
  {
    "id": "walkie-talkie",
    "source": "walkieTalkies",
    "name": "Walkie Talkie"
  },
  {
    "id": "digital-camera",
    "source": "digitalCameras",
    "name": "Digital Camera"
  },
  {
    "id": "anemometer",
    "source": "anemometers",
    "name": "Anemometer"
  },
  {
    "id": "mobiles",
    "source": "mobileSims",
    "name": "Mobiles"
  },
  {
    "id": "sims",
    "source": "mobileSims",
    "name": "SIMs"
  },
  {
    "id": "laptops-desktops",
    "source": "laptopsDesktops",
    "name": "Laptops & Desktops"
  },
  {
    "id": "pneumatic-drilling-machine",
    "source": "pneumaticDrillingMachines",
    "name": "Pneumatic Drilling"
  },
  {
    "id": "pneumatic-angle-grinder",
    "source": "pneumaticAngleGrinders",
    "name": "Pneumatic Grinder"
  },
  {
    "id": "wired-drilling-machine",
    "source": "wiredDrillingMachines",
    "name": "Wired Drilling"
  },
  {
    "id": "cordless-drilling-machine",
    "source": "cordlessDrillingMachines",
    "name": "Cordless Drilling"
  },
  {
    "id": "wired-angle-grinder",
    "source": "wiredAngleGrinders",
    "name": "Wired Grinder"
  },
  {
    "id": "cordless-angle-grinder",
    "source": "cordlessAngleGrinders",
    "name": "Cordless Grinder"
  },
  {
    "id": "cordless-reciprocating-saw",
    "source": "cordlessReciprocatingSaws",
    "name": "Reciprocating Saw"
  },
  {
    "id": "general-equipments",
    "source": "otherEquipments",
    "name": "General Equipments"
  }
];
type LabelItem = {
  id: string;
  itemType: string;
  name?: string;
  machineName?: string;
  equipmentName?: string;
  make?: string;
  model?: string;
  type?: string;
};

/** Use the current display category while retaining the original collection for transfers. */
export function transferItemLabel(item: LabelItem, organization: EquipmentOrganization = {}): string {
  const source = transferItemCollections[item.itemType as keyof typeof transferItemCollections];
  const assigned = organization.assignments?.[source + ':' + item.id];
  const assignedName = assigned
    ? organization.categories?.[assigned]?.name || categories.find(c => c.id === assigned)?.name
    : undefined;
  const nativeName = categories.find(c => c.source === source &&
    (source !== 'mobileSims' || c.id === (item.type === 'SIM' ? 'sims' : 'mobiles')))?.name;
  const category = assignedName || nativeName;
  const details = item.name?.trim() || item.machineName?.trim() || item.equipmentName?.trim() ||
    [item.make, item.model].filter(Boolean).join(' ').trim();
  if (category) {
    return details && details.toLowerCase() !== category.toLowerCase()
      ? category + ' — ' + details : category;
  }
  return details || 'Inventory Item';
}
