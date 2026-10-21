// Excel/Sheets copy ranges use tab-separated cells with quoted embedded newlines.
export function parseClipboard(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'&&(quoted||cell==='')){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&(c==='\t'||c==='\r'||c==='\n')){row.push(cell);cell='';if(c!=='\t'){rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}}
  else cell+=c;
 }
 if(quoted)throw new Error('The pasted range contains an unfinished quoted cell. Copy the cells again.');
 if(cell!==''||row.length||!rows.length){row.push(cell);rows.push(row);}
 if(rows.length>500)throw new Error('Paste up to 500 rows at a time.');
 return rows;
}
export function normalizePastedValue(field:string,value:string):string{
 if(field==='travelDate'||field==='followUpDate'||field==='lastFollowUpDate'){
  const match=value.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if(match)return `${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
 }
 return value;
}
