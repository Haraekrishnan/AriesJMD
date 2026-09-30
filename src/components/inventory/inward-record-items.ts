import type { InwardOutwardRecord, InventoryItem } from '@/lib/types';
/** Recover only the exact batch signature left by the old creation workflow. */
export function inwardRecordItemIds(record: InwardOutwardRecord, items: readonly InventoryItem[]): string[] {
 if (record.finalizedItemIds?.length) return record.finalizedItemIds;
 if (record.itemId) return [record.itemId];
 if (record.type !== 'Inward' || record.status !== 'Pending Details' || !record.date || !record.quantity) return [];
 const names = new Set((record.itemName || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
 const candidates = items.filter(item => item.lastUpdated === record.date && names.has(item.name.trim().toLowerCase()));
 return candidates.length === record.quantity && names.size === new Set(candidates.map(i => i.name.trim().toLowerCase())).size ? candidates.map(i => i.id) : [];
}
