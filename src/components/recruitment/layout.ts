import type {Field,Audit,CellFormat} from './model';
export const extraColumnFields:Field[]=['age','experience','salary','allowance','remark','followUp','followUpChannel','status','travelDate','travelNote'];
export type SharedLayout={sheets?:Record<string,{deleted?:boolean;deleting?:boolean;createdByName?:string}>;columnOrder?:Field[];columnWidths?:Record<string,number>;rowOrder?:string[];customColumns?:{id:`custom_${string}`;name:string;deleted?:boolean}[];columnFormats?:Record<string,CellFormat>;history?:Record<string,Audit>;extraColumns:Field[];revision:number;updatedBy?:string;updatedByName?:string;updatedAt?:string};
export const defaultLayout:SharedLayout={extraColumns:[],revision:0};
export function validateColumns(value:unknown):Field[]{if(!Array.isArray(value)||value.length>60||value.some(k=>!extraColumnFields.includes(k)&&!/^custom_[A-Za-z0-9_-]+$/.test(k))||new Set(value).size!==value.length)throw Error('Invalid worksheet columns.');return [...value];}
export function readLayout(value:SharedLayout|null):SharedLayout{return value?{...value,extraColumns:validateColumns(value.extraColumns||[])}:defaultLayout;}

export const builtInSheets=['On Going','Finalized','Not Interested'];
export function sheetNames(layout?:SharedLayout|null){return [...builtInSheets,...Object.keys(layout?.sheets||{}).filter(name=>!layout?.sheets?.[name].deleted&&!layout?.sheets?.[name].deleting)];}
export function validateSheetName(value:unknown){const name=String(value||'').trim();if(name.toLowerCase()==='history')throw Error('History is reserved by Excel. Choose another sheet name.');if(/[\u0000-\u001f\u007f]/.test(name))throw Error('Sheet names cannot contain control characters.');if(!name||name.length>31||/[.\/$#\[\]:*?\\]/.test(name)||name.startsWith("'")||name.endsWith("'"))throw Error('Use 1–31 characters without . / $ # [ ] : * ? or backslash.');return name;}
