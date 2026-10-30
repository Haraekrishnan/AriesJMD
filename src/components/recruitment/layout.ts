import type {Field,Audit,CellFormat} from './model';
export const extraColumnFields:Field[]=['age','experience','salary','allowance','remark','followUp','followUpChannel','status','travelDate','travelNote'];
export type SharedLayout={columnOrder?:Field[];columnWidths?:Record<string,number>;rowOrder?:string[];customColumns?:{id:`custom_${string}`;name:string;deleted?:boolean}[];columnFormats?:Record<string,CellFormat>;history?:Record<string,Audit>;extraColumns:Field[];revision:number;updatedBy?:string;updatedByName?:string;updatedAt?:string};
export const defaultLayout:SharedLayout={extraColumns:[],revision:0};
export function validateColumns(value:unknown):Field[]{if(!Array.isArray(value)||value.length>60||value.some(k=>!extraColumnFields.includes(k)&&!/^custom_[A-Za-z0-9_-]+$/.test(k))||new Set(value).size!==value.length)throw Error('Invalid worksheet columns.');return [...value];}
export function readLayout(value:SharedLayout|null):SharedLayout{return value?{...value,extraColumns:validateColumns(value.extraColumns||[])}:defaultLayout;}
