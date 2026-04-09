'use client';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Quotation } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

export const exportToExcel = async (quotation: Quotation) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Price Comparison");

    const vendorCount = quotation.vendors.length;
    const colsPerVendor = 4; // QTY, UOM, RATE, AMOUNT
    const totalColumns = 2 + (vendorCount * colsPerVendor); 

    // ===== TITLE (dynamic width) =====
    if (totalColumns > 1) {
      worksheet.mergeCells(1, 1, 1, totalColumns);
    }
    const title = worksheet.getCell('A1');
    title.value = 'PRICE COMPARISON - OFFICE & STORE CONTAINER';
    title.font = { bold: true, size: 14 };
    title.alignment = { horizontal: 'center' };

    // ===== VENDOR HEADER (dynamic) =====
    let vendorHeader: any[] = ['ITEM', 'DESCRIPTION'];
    quotation.vendors.forEach(v => {
        vendorHeader.push(v.name, '', '', '');
    });
    const vendorRow = worksheet.addRow(vendorHeader);

    // Merge each vendor block
    let colStart = 3;
    quotation.vendors.forEach(() => {
        worksheet.mergeCells(vendorRow.number, colStart, vendorRow.number, colStart + 3);
        const cell = vendorRow.getCell(colStart);
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF00' }
        };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
        colStart += 4;
    });

    // ===== COLUMN HEADERS (BLUE) =====
    let header: string[] = ['ITEM', 'DESCRIPTION'];
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

        quotation.vendors.forEach((vendor) => {
            let quote: any;
            if (Array.isArray(vendor.quotes)) {
              quote = vendor.quotes.find(q => q.itemId === item.id || (q as any).id === item.id) || vendor.quotes[itemIndex];
            } else if (vendor.quotes) {
              quote =
                (vendor.quotes as any)[item.id] ||
                Object.values(vendor.quotes)[itemIndex] ||
                Object.values(vendor.quotes).find((q: any) => q.itemId === item.id || q.id === item.id);
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
          quote = vendor.quotes.find(q => q.itemId === item.id || (q as any).id === item.id) || vendor.quotes[itemIndex];
        } else if (vendor.quotes) {
          quote = (vendor.quotes as any)[item.id] || Object.values(vendor.quotes)[itemIndex];
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

    const addRow = (label: string, values: number[]) => {
        let rowData: any[] = ['', label];
        // This creates empty cells to align the totals under each vendor's block
        for (let i = 0; i < vendorCount; i++) {
            rowData.push('', '', '', values[i] || 0);
        }
        const row = worksheet.addRow(rowData);
        row.font = { bold: true };

        // Format the total value cells which are in the 'AMOUNT' column for each vendor
        for (let i = 0; i < vendorCount; i++) {
            const cellIndex = 2 + (i * 4) + 4; // 2 initial cols + (vendor blocks * cols per vendor) + offset to AMOUNT
            row.getCell(cellIndex).numFmt = '₹ #,##0.00';
            // Merge the cells for each vendor's total to span their block
            worksheet.mergeCells(row.number, cellIndex - 3, row.number, cellIndex);
            row.getCell(cellIndex - 3).alignment = { horizontal: 'right', vertical: 'middle' };
        }
    };


    worksheet.addRow([]); // Spacer

    addRow('Subtotal', totals.map(t => t.subTotal));

    const allCostNames = Array.from(new Set(totals.flatMap(t => t.additionalCosts.map(c => c.name))));
    allCostNames.forEach(costName => {
        if (costName) { // Ensure cost name is not empty
            const costValues = totals.map(t => t.additionalCosts.find(c => c.name === costName)?.value || 0);
            addRow(costName, costValues);
        }
    });

    addRow('GST', totals.map(t => t.totalTax));
    addRow('Grand Total', totals.map(t => t.grandTotal));

    // ===== COLUMN WIDTHS =====
    worksheet.getColumn(1).width = 8; // Item No
    worksheet.getColumn(2).width = 35; // Description
    let col = 3;
    for (let i = 0; i < vendorCount; i++) {
      worksheet.getColumn(col++).width = 8; // QTY
      worksheet.getColumn(col++).width = 8; // UOM
      worksheet.getColumn(col++).width = 12; // RATE
      worksheet.getColumn(col++).width = 15; // AMOUNT
    }
    
    // ===== BORDERS =====
    worksheet.eachRow(row => {
        if(row.values.length > 0) {
            row.eachCell({ includeEmpty: true }, cell => {
                if (cell.address.match(/^[A-Z]+1$/) && totalColumns > 1) return; // Skip title row border
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
