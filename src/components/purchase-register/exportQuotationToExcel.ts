'use client';
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
    
    // Vendor Names Header Row
    let vendorHeader: (string | null)[] = ['', '', ''];
    quotation.vendors.forEach(vendor => {
        vendorHeader.push(vendor.name, '', '', '');
    });
    const vendorRow = worksheet.addRow(vendorHeader);
    let vendorCol = 4;
    quotation.vendors.forEach(() => {
        worksheet.mergeCells(vendorRow.number, vendorCol, vendorRow.number, vendorCol + 3);
        vendorRow.getCell(vendorCol).alignment = { horizontal: 'center' };
        vendorRow.getCell(vendorCol).font = { bold: true };
        vendorCol += 4;
    });
    vendorRow.commit();

    // Header for items
    let header = ['Sl. No', 'DESCRIPTION', 'UOM'];
    quotation.vendors.forEach(() => {
        header.push('QTY', 'RATE', 'TAX %', 'AMOUNT');
    });
    const headerRow = worksheet.addRow(header);
    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    // Items
    quotation.items.forEach((item, index) => {
        let rowData: any[] = [index + 1, item.description, item.uom];
        quotation.vendors.forEach(vendor => {
            const quote = vendor.quotes.find(q => q.itemId === item.id);
            rowData.push(quote?.quantity || 0, quote?.rate || 0, quote?.taxPercent || 0, (quote?.quantity || 0) * (quote?.rate || 0));
        });
        worksheet.addRow(rowData);
    });
    
    // Totals logic
    const calculatedTotals = quotation.vendors.map(vendor => {
        const subTotal = vendor.quotes.reduce((acc, quote) => acc + (quote.quantity * quote.rate), 0);
        const totalTax = vendor.quotes.reduce((acc, quote) => acc + (quote.quantity * quote.rate * (quote.taxPercent / 100)), 0);
        const additionalCostsTotal = (vendor.additionalCosts || []).reduce((acc, cost) => acc + cost.value, 0);
        const grandTotal = subTotal + totalTax + additionalCostsTotal;
        return { vendorId: vendor.vendorId, subTotal, totalTax, additionalCosts: vendor.additionalCosts || [], grandTotal };
    });

    const addFooterRow = (label: string, dataExtractor: (total: typeof calculatedTotals[0], vendor: typeof quotation.vendors[0]) => string | number) => {
        const newRow = worksheet.addRow([]);
        newRow.getCell(3).value = label;
        newRow.getCell(3).font = { bold: true };
        newRow.getCell(3).alignment = { horizontal: 'right' };
        
        let currentCell = 4;
        calculatedTotals.forEach((total, i) => {
            const value = dataExtractor(total, quotation.vendors[i]);
            const cell = newRow.getCell(currentCell + 3); // Amount column
            cell.value = value;
            cell.alignment = { horizontal: 'right' };
            cell.font = { bold: true };
            if (typeof value === 'number') {
              cell.numFmt = '#,##0.00';
            }
            currentCell += 4;
        });
    };
    
    worksheet.addRow([]); // Spacer
    addFooterRow('Sub-Total', (total) => total.subTotal);

    const allCostNames = Array.from(new Set(quotation.vendors.flatMap(v => v.additionalCosts?.map(ac => ac.name) || [])));
    allCostNames.forEach(costName => {
        addFooterRow(costName, (total) => total.additionalCosts.find(c => c.name === costName)?.value || 0);
    });
    
    addFooterRow('Total Tax', (total) => total.totalTax);
    addFooterRow('Grand Total', (total) => total.grandTotal);


    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${quotation.title.replace(/ /g, "_")}.xlsx`);
};
