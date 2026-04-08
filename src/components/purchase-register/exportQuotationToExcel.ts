import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Quotation } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

export const exportToExcel = async (quotation: Quotation) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(quotation.title.replace(/[\\/*?:]/g, "").substring(0, 31));

    // A1: PRICE COMPARISON
    worksheet.mergeCells('A1:Z1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'PRICE COMPARISON';
    titleCell.font = { name: 'Calibri', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    // Header for items
    let header = ['Sl. No', 'DESCRIPTION', 'UOM'];
    quotation.vendors.forEach(() => {
        header.push('QTY', 'RATE', 'AMOUNT');
    });
    worksheet.addRow(header);

    // Vendor Names Header Row
    let vendorHeader: (string | null)[] = ['', '', ''];
     quotation.vendors.forEach(vendor => {
        vendorHeader.push(vendor.name, '', '');
    });
    const vendorRow = worksheet.addRow(vendorHeader);
    let col = 4;
    quotation.vendors.forEach(() => {
        worksheet.mergeCells(vendorRow.number, col, vendorRow.number, col + 2);
        col += 3;
    });

    // Items
    quotation.items.forEach((item, index) => {
        let rowData: any[] = [index + 1, item.description, item.uom];
        quotation.vendors.forEach(vendor => {
            const quote = vendor.quotes.find(q => q.itemId === item.id);
            rowData.push(quote?.quantity || 0, quote?.rate || 0, (quote?.quantity || 0) * (quote?.rate || 0));
        });
        worksheet.addRow(rowData);
    });
    
    // Totals logic
    const calculatedTotals = quotation.vendors.map(vendor => {
      const subTotal = vendor.quotes.reduce((acc, quote) => acc + (quote.quantity * quote.rate), 0);
      const transport = parseFloat(vendor.transportation || '0') || 0;
      const totalBeforeGst = subTotal + transport;
      const gstAmount = totalBeforeGst * (vendor.gstPercent / 100);
      const grandTotal = totalBeforeGst + gstAmount;
      return { vendorId: vendor.vendorId, subTotal, transport, totalBeforeGst, gstAmount, grandTotal };
    });

    const addFooterRow = (label: string, dataExtractor: (total: typeof calculatedTotals[0], vendor: typeof quotation.vendors[0]) => string | number) => {
        let rowData: any[] = [label];
        worksheet.mergeCells(worksheet.lastRow!.number + 1, 1, worksheet.lastRow!.number + 1, 3);
        const newRow = worksheet.addRow(rowData);
        calculatedTotals.forEach((total, i) => {
            newRow.getCell(4 + i*3).value = dataExtractor(total, quotation.vendors[i]);
            worksheet.mergeCells(newRow.number, 4 + i*3, newRow.number, 6 + i*3);
        });
    };

    worksheet.addRow([]); // Spacer
    addFooterRow('Sub-Total', (total) => total.subTotal);
    addFooterRow('Transportation', (total, vendor) => vendor.transportation || '0');
    addFooterRow('Total', (total) => total.totalBeforeGst);
    addFooterRow('GST %', (total, vendor) => `${vendor.gstPercent}%`);
    addFooterRow('Grand Total', (total) => total.grandTotal);


    // Formatting...
    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            cell.alignment = { ...cell.alignment, horizontal: 'center' };
        });
    });


    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${quotation.title.replace(/ /g, "_")}.xlsx`);
};
