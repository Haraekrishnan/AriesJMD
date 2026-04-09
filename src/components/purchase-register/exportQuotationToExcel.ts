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

    // ===== TITLE =====
    worksheet.mergeCells('A1:L1');
    const title = worksheet.getCell('A1');
    title.value = 'PRICE COMPARISON - OFFICE & STORE CONTAINER';
    title.font = { bold: true, size: 14 };
    title.alignment = { horizontal: 'center', vertical: 'middle' };

    // ===== VENDOR GROUP HEADER (YELLOW) =====
    const vendorRow = worksheet.addRow([
        '', '', '',
        quotation.vendors[0]?.name, '', '',
        quotation.vendors[1]?.name, '', '',
        quotation.vendors[2]?.name, '', ''
    ]);

    worksheet.mergeCells(`D${vendorRow.number}:F${vendorRow.number}`);
    worksheet.mergeCells(`G${vendorRow.number}:I${vendorRow.number}`);
    worksheet.mergeCells(`J${vendorRow.number}:L${vendorRow.number}`);

    vendorRow.eachCell((cell, col) => {
        if (col >= 4) {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFF00' } // Yellow
            };
            cell.font = { bold: true };
            cell.alignment = { horizontal: 'center' };
        }
    });

    // ===== COLUMN HEADERS (BLUE) =====
    const headerRow = worksheet.addRow([
        'ITEM', 'DESCRIPTION', 'QTY', 'UOM',
        'RATE', 'AMOUNT',
        'QTY', 'UOM', 'RATE', 'AMOUNT',
        'QTY', 'UOM', 'RATE', 'AMOUNT'
    ]);

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
    quotation.items.forEach((item, index) => {
        let row: any[] = [
            index + 1,
            item.description
        ];

        quotation.vendors.forEach(vendor => {
            const q = vendor.quotes.find(q => q.itemId === item.id);

            row.push(
                q?.quantity || 0,
                item.uom,
                q?.rate || 0,
                (q?.quantity || 0) * (q?.rate || 0)
            );
        });

        const addedRow = worksheet.addRow(row);

        // Currency format
        [5,6,9,10,13,14].forEach(col => {
            addedRow.getCell(col).numFmt = '₹ #,##0.00';
        });
    });

    // ===== TOTAL CALCULATIONS =====
    const totals = quotation.vendors.map(v => {
        const sub = v.quotes.reduce((a, q) => a + (q.quantity * q.rate), 0);
        const tax = v.quotes.reduce((a, q) => a + (q.quantity * q.rate * (q.taxPercent / 100)), 0);
        return {
            sub,
            tax,
            grand: sub + tax
        };
    });

    const addRow = (label: string, values: number[]) => {
        const row = worksheet.addRow(['', label, '', '',
            values[0], '',
            values[1], '',
            values[2]
        ]);

        row.font = { bold: true };

        [5,7,9].forEach(col => {
            row.getCell(col).numFmt = '₹ #,##0.00';
        });
    };

    worksheet.addRow([]);

    addRow('Subtotal', totals.map(t => t.sub));
    addRow('GST 18%', totals.map(t => t.tax));
    addRow('Grand Total', totals.map(t => t.grand));

    // ===== COLUMN WIDTH =====
    worksheet.columns.forEach(col => {
        col.width = 15;
    });

    // ===== BORDERS =====
    worksheet.eachRow(row => {
        row.eachCell(cell => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Price_Comparison.xlsx');
};