'use client';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Quotation } from '@/lib/types';
import { format, parseISO } from 'date-fns';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

export const exportToExcel = async (quotation: Quotation) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Price Comparison");

    const vendorCount = quotation.vendors.length;
    const colsPerVendor = 4; // QTY, UOM, RATE, AMOUNT
    const totalColumns = 2 + (vendorCount * colsPerVendor); 

    // ===== TITLE (dynamic) =====
    worksheet.mergeCells(1, 1, 1, totalColumns);
    const title = worksheet.getCell('A1');
    title.value = `PRICE COMPARISON - ${quotation.title.toUpperCase()}`;
    title.font = { bold: true, size: 14 };
    title.alignment = { horizontal: 'center' };

    // ===== VENDOR HEADER (dynamic) =====
    let vendorHeader: any[] = ['', '']; // Empty placeholders for Sl. No and Description

    quotation.vendors.forEach(v => {
        vendorHeader.push(v.name, '', '', '');
    });

    const vendorRow = worksheet.addRow(vendorHeader);

    // Merge each vendor block
    let colStart = 3;
    quotation.vendors.forEach((vendor) => {
        worksheet.mergeCells(vendorRow.number, colStart, vendorRow.number, colStart + 3);

        const cell = vendorRow.getCell(colStart);
        cell.value = vendor.name;
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF00' } // Yellow
        };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };

        colStart += 4;
    });

    // ===== COLUMN HEADERS (BLUE) =====
    let header: string[] = ['Sl. No', 'DESCRIPTION']; // Corrected header labels

    quotation.vendors.forEach(() => {
        header.push('QTY', 'UOM', 'RATE', 'AMOUNT');
    });

    const headerRow = worksheet.addRow(header);
    headerRow.eachCell(cell => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '305496' } // Blue
        };
        cell.font = { color: { argb: 'FFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center' };
    });

    // ===== ITEMS =====
    quotation.items.forEach((item, itemIndex) => {
        let rowData: any[] = [
            itemIndex + 1,
            item.description
        ];

        quotation.vendors.forEach(vendor => {
            let quote: any;
            if (Array.isArray(vendor.quotes)) {
                quote = vendor.quotes[itemIndex] || vendor.quotes.find(q => q.itemId === item.id || (q as any).id === item.id);
            } else if (vendor.quotes) {
                quote = (vendor.quotes as any)[item.id] || Object.values(vendor.quotes)[itemIndex] || Object.values(vendor.quotes).find((q: any) => q.itemId === item.id || (q as any).id === item.id);
            }

            rowData.push(
                quote?.quantity || 0,
                item.uom,
                quote?.rate || 0,
                (quote?.quantity || 0) * (quote?.rate || 0)
            );
        });

        const addedRow = worksheet.addRow(rowData);

        // Currency formatting for RATE and AMOUNT for each vendor
        for (let i = 0; i < vendorCount; i++) {
            const baseCol = 3 + (i * 4);
            addedRow.getCell(baseCol + 2).numFmt = '₹ #,##0.00'; // RATE
            addedRow.getCell(baseCol + 3).numFmt = '₹ #,##0.00'; // AMOUNT
        }
    });

    // ===== TOTAL CALCULATIONS =====
    const totals = quotation.vendors.map(vendor => {
      let subTotal = 0;
      let totalTax = 0;

      quotation.items.forEach((item, itemIndex) => {
        let quote: any;
        if (Array.isArray(vendor.quotes)) {
            quote = vendor.quotes[itemIndex] || vendor.quotes.find(q => q.itemId === item.id || (q as any).id === item.id);
        } else if (vendor.quotes) {
            quote = (vendor.quotes as any)[item.id] || Object.values(vendor.quotes)[itemIndex] || Object.values(vendor.quotes).find((q: any) => q.itemId === item.id || (q as any).id === item.id);
        }
        
        if (quote) {
            const amount = (quote.quantity || 0) * (quote.rate || 0);
            subTotal += amount;
            totalTax += amount * ((quote.taxPercent || 0) / 100);
        }
      });
    
      const additionalCostsArray = Array.isArray(vendor.additionalCosts) ? vendor.additionalCosts : Object.values(vendor.additionalCosts || []);
      const additionalCostsTotal = additionalCostsArray.reduce((acc, cost) => acc + (cost.value || 0), 0);

      const grandTotal = subTotal + totalTax + additionalCostsTotal;
      return {
        subTotal,
        totalTax,
        additionalCosts: additionalCostsArray,
        grandTotal,
      };
    });
    
    const minGrandTotal = Math.min(...totals.map(t => t.grandTotal).filter(t => t > 0));

    const addRow = (label: string, values: number[], isGrandTotal = false) => {
        const row = worksheet.addRow([label]);
        row.getCell(1).font = { bold: true };
        row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
        worksheet.mergeCells(row.number, 1, row.number, 2);

        let colStart = 3;
        values.forEach((value, index) => {
            worksheet.mergeCells(row.number, colStart, row.number, colStart + 3);
            const cell = row.getCell(colStart);
            cell.value = value || 0;
            cell.numFmt = '₹ #,##0.00';
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.font = { bold: true };

            if (isGrandTotal && value > 0 && value === minGrandTotal) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
            }
            colStart += 4;
        });
    };

    worksheet.addRow([]); // Spacer

    addRow('Subtotal', totals.map(t => t.subTotal));

    const allCostNames = Array.from(new Set(totals.flatMap(t => t.additionalCosts.map(c => c.name))));
    allCostNames.forEach(costName => {
        if (costName) {
            const costValues = totals.map(t => t.additionalCosts.find(c => c.name === costName)?.value || 0);
            addRow(costName, costValues);
        }
    });

    addRow('GST', totals.map(t => t.totalTax));
    addRow('Grand Total', totals.map(t => t.grandTotal), true);

    // ===== COLUMN WIDTHS =====
    worksheet.getColumn(1).width = 8;
    worksheet.getColumn(2).width = 35;
    for (let i = 0; i < vendorCount; i++) {
        const colBase = 3 + (i * 4);
        worksheet.getColumn(colBase).width = 8; // QTY
        worksheet.getColumn(colBase + 1).width = 8; // UOM
        worksheet.getColumn(colBase + 2).width = 12; // RATE
        worksheet.getColumn(colBase + 3).width = 15; // AMOUNT
    }
    
    // ===== BORDERS =====
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // Skip title row
            row.eachCell({ includeEmpty: true }, cell => {
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
            });
        }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${quotation.title.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
};
