import type {RecordEntry,Field} from './model';
import {sheetNames,type SharedLayout} from './layout';
import {reportColumns,reportPalette as p,reportCellStyle,reportGroup} from './report-design';
import {indiaToday} from './followUp';
export async function buildRecruitmentWorkbook(records:RecordEntry[],fields:Field[],labels:Record<Field,string>,layout:SharedLayout|null,preparedBy:string,now=new Date()){
 const ExcelJS=await import('exceljs');const book=new ExcelJS.Workbook();book.creator=preparedBy;book.created=now;
 const extra=(layout?.customColumns||[]).filter(c=>!c.deleted);const keys=[...reportColumns,...fields.filter(k=>!reportColumns.includes(k)),...extra.map(c=>c.id)];const unique=[...new Set([...(layout?.columnOrder||[]).filter(k=>keys.includes(k)),...keys])];
 const audit=['Assigned by','Assigned at','Completed by','Completed at','Created by','Created at','Updated by','Updated at'];
 const titles=['No.',...unique.map(k=>k==='name'?'Candidate name':k==='designation'?'Trade':labels[k]||extra.find(c=>c.id===k)?.name||k),...audit];
 const stamp=(value:string)=>value?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):'';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 for(const stage of sheetNames(layout)){
 const sheet=book.addWorksheet(stage,{properties:{tabColor:{argb:stage==='Finalized'?'FF5AB887':stage==='Not Interested'?'FFDC758A':'FF173B60'}},views:[{state:'frozen',xSplit:2,ySplit:5,showGridLines:false}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:5'}});
 sheet.columns=titles.map((title,i)=>({width:i===0?7:(layout?.columnWidths?.[unique[i-1]]?Math.max(10,layout.columnWidths[unique[i-1]]/7):['Candidate name','Follow-up note','Remark','Travel / joining note'].includes(title)?32:22)}));
 const fill=(hex:string)=>({type:'pattern' as const,pattern:'solid' as const,fgColor:{argb:'FF'+hex}});
 const border={style:'thin' as const,color:{argb:'FF'+p.border}};
 sheet.mergeCells(1,1,1,4);sheet.getCell(1,1).value='ARIES MARINE JMD';sheet.mergeCells(1,5,1,10);sheet.getCell(1,5).value='RECRUITMENT REGISTER';
 sheet.mergeCells(2,1,2,4);sheet.getCell(2,1).value=stage.toUpperCase();sheet.mergeCells(2,5,2,10);sheet.getCell(2,5).value='Exported: '+stamp(now.toISOString())+' IST  |  Prepared by: '+preparedBy;
 sheet.mergeCells(3,1,3,10);sheet.getCell(3,1).value='Candidate records • All records exported';
 const groups=['CANDIDATE DETAILS',...unique.map(reportGroup),...audit.map(()=> 'ADDITIONAL DETAILS & AUDIT')];let start=1;for(let i=1;i<=groups.length;i++){if(i===groups.length||groups[i]!==groups[start-1]){if(i>start)sheet.mergeCells(4,start,4,i);sheet.getCell(4,start).value=groups[start-1];start=i+1;}}
 sheet.getRow(5).values=titles;sheet.autoFilter={from:{row:5,column:1},to:{row:5,column:titles.length}};
 for(let row=1;row<=5;row++){const r=sheet.getRow(row);r.height=row===1?42:row===5?32:26;for(let col=1;col<=titles.length;col++){const cell=r.getCell(col);cell.font={name:'Calibri',size:row===1?20:11,bold:row!==3,color:{argb:'FF'+(row===1||row===5?p.white:p.navy)}};cell.fill=fill(row===1||row===5?p.navy:row===4?p.group:p.white);cell.alignment={vertical:'middle',wrapText:true};cell.border={bottom:border};}}
 const entries=records.filter(r=>!r.deletedAt&&r.values.stage===stage);
 entries.forEach((record,index)=>{const row=sheet.addRow([index+1,...unique.map(k=>k==='assignedTo'?(record.assignedToName||record.values.assignedTo||'Unassigned'):record.values[k]||''),record.assignedByName||'',stamp(record.assignedAt||''),record.completedByName||'',stamp(record.completedAt||''),record.createdByName,stamp(record.createdAt),record.updatedByName,stamp(record.updatedAt)]);let lines=1;
 row.eachCell({includeEmpty:true},(cell,col)=>{const key=unique[col-2]||'',style=reportCellStyle(record,key,index,layout,today);cell.font={name:'Calibri',size:11,bold:key==='name'||key==='documents',color:{argb:'FF'+style.color!.slice(1)}};cell.fill=fill(style.backgroundColor!.slice(1));cell.border={top:border,left:border,bottom:border,right:border};cell.alignment={vertical:'middle',wrapText:true};
 if(['lastFollowUpDate','followUpDate','travelDate'].includes(key)&&/^\d{4}-\d{2}-\d{2}$/.test(String(cell.value))){cell.value=new Date(String(cell.value)+'T00:00:00Z');cell.numFmt='dd mmm yyyy';}
 else if(['salary','age'].includes(key)&&String(cell.value).trim()&&Number.isFinite(Number(cell.value))){cell.value=Number(cell.value);cell.numFmt=key==='salary'?'#,##0.00':'0';}else if(key==='contact')cell.numFmt='@';
 const width=sheet.getColumn(col).width||22;lines=Math.max(lines,Math.ceil(String(record.values[key as Field]||cell.value||'').length/width));});row.height=Math.max(32,Math.min(180,lines*15+12));});
 const foot=sheet.addRow(['Colour key:','Completed','Pending','Overdue follow-up','Due today']);foot.height=28;for(let i=1;i<=5;i++){const c=foot.getCell(i);c.font={name:'Calibri',size:11,bold:true,color:{argb:'FF'+p.text}};c.fill=fill([p.white,p.green,p.amber,p.red,p.amber][i-1]);c.alignment={vertical:'middle',wrapText:true};}
 }
 return book;
}
export async function downloadRecruitmentWorkbook(...args:Parameters<typeof buildRecruitmentWorkbook>){const book=await buildRecruitmentWorkbook(...args);const bytes=await book.xlsx.writeBuffer();const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const link=document.createElement('a');link.href=url;link.download='Recruitment.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
