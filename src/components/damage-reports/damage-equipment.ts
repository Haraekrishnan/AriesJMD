/** Shared catalogue for damage selection, review and approval. */
export const damageEquipmentSources = ["inventoryItems","utMachines","dftMachines","digitalCameras","anemometers","otherEquipments","pneumaticDrillingMachines","pneumaticAngleGrinders","wiredDrillingMachines","cordlessDrillingMachines","wiredAngleGrinders","cordlessAngleGrinders","cordlessReciprocatingSaws","weldingMachines","walkieTalkies","mobileSims","laptopsDesktops"] as const;
export function damageEquipmentItems(inventory: Partial<Record<typeof damageEquipmentSources[number], readonly any[]>>) {
 return damageEquipmentSources.flatMap(source => (inventory[source] || []).map(item => ({...item, source, name: item.name || item.machineName || item.equipmentName || item.model || source.replace(/([A-Z])/g, ' $1'), serialNumber: item.serialNumber || item.serialNo || item.imei || item.simNumber || item.number || ''})));
}
