// Do not traverse RHF refs: they can contain circular DOM references.
export function comparisonValidationMessages(errors: unknown, values?: {items?: {description?: string}[]; vendors?: {name?: string}[]}): string[] {
    const messages: string[] = [];
    const labels: Record<string, string> = {
        title: 'Comparison title', vendorId: 'Vendor selection', name: 'Name',
        description: 'Description', uom: 'Unit', quantity: 'Quantity', rate: 'Rate',
        taxPercent: 'Tax %', receivedQuantity: 'Received quantity', value: 'Amount',
        id: 'Row reference', itemId: 'Item reference', itemType: 'Item type',
    };
    function visit(value: unknown, path: string[]) {
        if (!value || typeof value !== 'object') return;
        const node = value as Record<string, unknown>;
        if (typeof node.message === 'string') {
            const parts: string[] = [];
            for (let i = 0; i < path.length; i++) {
                const key = path[i];
                if (['vendors', 'items', 'quotes', 'additionalCosts'].includes(key)) {
                    const groupLabels: Record<string, string> = {vendors:'Vendor',items:'Item',quotes:'Item',additionalCosts:'Extra cost'};
                    const label = groupLabels[key];
                    if (/^\d+$/.test(path[i + 1] || '')) {
                        const index = Number(path[++i]);
                        const detail = key === 'vendors' ? values?.vendors?.[index]?.name : ['items','quotes'].includes(key) ? values?.items?.[index]?.description : '';
                        parts.push(`${label} ${index + 1}${detail ? ' (' + detail + ')' : ''}`);
                    }
                    else parts.push(label || key);
                } else if (key !== 'root') parts.push(labels[key] || key);
            }
            messages.push(`${parts.join(' · ')}: ${node.message}`);
        }
        Object.entries(node).forEach(([key, child]) => {
            if (!['ref', 'message', 'type', 'types'].includes(key)) visit(child, [...path, key]);
        });
    }
    visit(errors, []);
    return messages;
}
