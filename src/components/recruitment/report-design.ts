import type {Field,RecordEntry,CellFormat} from './model';
import type {SharedLayout} from './layout';
import {followUpState} from './followUp';
export const reportColumns:Field[]=['name','contact','designation','documents','lastFollowUpDate','followUpDate','followUpOutcome','followUpNote','assignedTo'];
export const reportPalette={navy:'173B60',text:'172B4D',border:'BECAD5',stripe:'EDF2F6',white:'FFFFFF',group:'DCE6F0',green:'D9F2DC',greenText:'17602C',amber:'FFF0C2',amberText:'805015',red:'FADBDD',redText:'AA1725'};
export function reportCellStyle(record:RecordEntry,field:string,index:number,layout?:SharedLayout|null,today?:string):CellFormat{
 let style:CellFormat={color:'#'+reportPalette.text,backgroundColor:'#'+(index%2?reportPalette.stripe:reportPalette.white)};
 if(field==='documents'&&record.values.documents){const complete=/^complet/i.test(record.values.documents);style={color:'#'+(complete?reportPalette.greenText:reportPalette.amberText),backgroundColor:'#'+(complete?reportPalette.green:reportPalette.amber)};}
 if(field==='followUpDate'){const state=followUpState(record.values.followUpDate,record.values.stage,today);if(state==='Overdue'||state==='Today')style={color:'#'+(state==='Overdue'?reportPalette.redText:reportPalette.amberText),backgroundColor:'#'+(state==='Overdue'?reportPalette.red:reportPalette.amber)};}
 for(const layer of [layout?.columnFormats?.[field],record.formatting?.row,record.formatting?.[field]])for(const [key,value] of Object.entries(layer||{}))if(value)style={...style,[key]:value};return style;
}
export function reportGroup(key:string){return ['name','contact','designation'].includes(key)?'CANDIDATE DETAILS':['documents','lastFollowUpDate','followUpDate','followUpOutcome','followUpNote'].includes(key)?'DOCUMENTS & FOLLOW-UP':key==='assignedTo'?'RESPONSIBILITY':'ADDITIONAL DETAILS & AUDIT';}
