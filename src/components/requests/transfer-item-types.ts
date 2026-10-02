export const transferItemCollections = {
  "Inventory": "inventoryItems",
  "UTMachine": "utMachines",
  "DftMachine": "dftMachines",
  "DigitalCamera": "digitalCameras",
  "Anemometer": "anemometers",
  "OtherEquipment": "otherEquipments",
  "LaptopDesktop": "laptopsDesktops",
  "MobileSim": "mobileSims",
  "WeldingMachine": "weldingMachines",
  "WalkieTalkie": "walkieTalkies",
  "PneumaticDrillingMachine": "pneumaticDrillingMachines",
  "PneumaticAngleGrinder": "pneumaticAngleGrinders",
  "WiredDrillingMachine": "wiredDrillingMachines",
  "CordlessDrillingMachine": "cordlessDrillingMachines",
  "WiredAngleGrinder": "wiredAngleGrinders",
  "CordlessAngleGrinder": "cordlessAngleGrinders",
  "CordlessReciprocatingSaw": "cordlessReciprocatingSaws"
} as const;
export function transferItemProjectUpdates(items: readonly {itemType: string; itemId: string}[], projectId: string) {
 const updates: Record<string, string> = {};
 for (const item of items) {
  const collection = transferItemCollections[item.itemType as keyof typeof transferItemCollections];
  if (!collection) throw new Error('Unsupported transfer item type: ' + item.itemType);
  updates[collection + '/' + item.itemId + '/projectId'] = projectId;
 }
 return updates;
}
