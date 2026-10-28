import type {Field} from './model';
export const extraColumnFields:Field[]=['age','experience','salary','allowance','remark','followUp','followUpChannel','status','travelDate','travelNote'];
export type SharedLayout={extraColumns:Field[];revision:number;updatedBy?:string;updatedByName?:string;updatedAt?:string};
export const defaultLayout:SharedLayout={extraColumns:[],revision:0};
export function validateColumns(value:unknown):Field[]{if(!Array.isArray(value)||value.length>extraColumnFields.length||value.some(k=>!extraColumnFields.includes(k))||new Set(value).size!==value.length)throw Error('Invalid worksheet columns.');return [...value];}
export function readLayout(value:SharedLayout|null):SharedLayout{return value?{...value,extraColumns:validateColumns(value.extraColumns||[])}:defaultLayout;}
