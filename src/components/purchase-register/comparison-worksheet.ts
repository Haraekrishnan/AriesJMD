export type GridColumn = { key: 'description' | 'uom' | 'quantity' | 'rate' | 'taxPercent'; vendor?: number };
export function gridColumns(vendorCount: number, separate: boolean): GridColumn[] {
  const result: GridColumn[] = [{key:'description'},{key:'uom'}];
  if (!separate) result.push({key:'quantity'});
  for(let vendor=0;vendor<vendorCount;vendor++) {
    if(separate) result.push({key:'quantity',vendor});
    result.push({key:'rate',vendor},{key:'taxPercent',vendor});
  }
  return result;
}
export function parseGridPaste(text: string): string[][] {
  const rows: string[][]=[]; let row:string[]=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"' && (quoted || cell==='')) {if(quoted && text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(!quoted && (c==='\t'||c==='\n'||c==='\r')) {
      row.push(cell);cell='';
      if(c!=='\t'){if(c==='\r'&&text[i+1]==='\n')i++;rows.push(row);row=[];}
    } else cell+=c;
  }
  if(quoted) throw new Error('The pasted text contains an unclosed quoted cell. Copy the Excel cells again.');
  row.push(cell);rows.push(row);
  while(rows.length && rows[rows.length-1].every(c=>!c.trim()))rows.pop();
  if(rows.length>500)throw new Error('Paste up to 500 rows at a time.');
  return rows;
}
export function pastePlan(text:string,columns:GridColumn[],startRow:number,startColumn:number) {
  const rows=parseGridPaste(text);
  const changes: {row:number;column:GridColumn;value:string|number}[]=[];
  rows.forEach((cells,r)=>cells.forEach((raw,c)=>{
    const column=columns[startColumn+c];
    if(!column)throw new Error(`Pasted row ${r+1} has too many columns. Paste editable cells only, without calculated Amount columns.`);
    let value:string|number=raw;
    if(!['description','uom'].includes(column.key)) {
      const clean=raw.trim().replace(/[₹,]/g,'').replace(/%$/,'');
      if(clean==='')value='';
      else {value=Number(clean);if(!Number.isFinite(value)||value<0||(column.key==='taxPercent'&&value>100))throw new Error(`Pasted row ${r+1}, column ${c+1}: ${column.key==='taxPercent'?'Tax must be between 0 and 100':'Enter a non-negative number'}.`);}
    }
    changes.push({row:startRow+r,column,value});
  }));
  return {changes,rowCount:rows.length};
}
export function hasSeparateQuantities(vendors:any[]) {
  const first=vendors[0]?.quotes || [];
  return vendors.slice(1).some(v=>(v.quotes||[]).some((q:any,i:number)=>Number(q.quantity)!==Number(first[i]?.quantity)));
}
export function prepareWorksheet(values:any, blankIds:Set<string>) {
  const keep:number[]=[];
  values.items.forEach((item:any,i:number)=>{
    const unused=blankIds.has(item.itemId) && !item.description?.trim() && ['', 'Nos'].includes(item.uom||'') && [undefined,'',1,'1'].includes(item.quantity) && values.vendors.every((v:any)=>{
      const q=v.quotes[i];return !q || ([undefined,'',1,'1'].includes(q.quantity) && !Number(q.rate) && !Number(q.taxPercent) && !Number(q.receivedQuantity));
    });
    if(!unused)keep.push(i);
  });
  return {keep,values:{...values,items:keep.map(i=>values.items[i]),vendors:values.vendors.map((v:any)=>({...v,quotes:keep.map(i=>v.quotes[i])}))}};
}
export function restoreErrorRows(errors:any,keep:number[]) {
  const remap=(rows:any)=>{if(!rows || !Array.isArray(rows))return rows;const mapped:any[]=[];Object.assign(mapped,rows);for(let i=0;i<rows.length;i++)delete mapped[i];rows.forEach((error:any,i:number)=>{if(error)mapped[keep[i]]=error;});return mapped;};
  return {...errors,...(errors.items?{items:remap(errors.items)}:{}),...(errors.vendors?{vendors:Array.isArray(errors.vendors)?errors.vendors.map((v:any)=>v?.quotes?{...v,quotes:remap(v.quotes)}:v):errors.vendors}:{})};
}
export function errorPaths(errors:any,path=''):string[] {
  if(!errors || typeof errors!=='object')return [];
  if(typeof errors.message==='string')return [path];
  return Object.entries(errors).filter(([key])=>!['ref','types','type'].includes(key)).flatMap(([key,value])=>errorPaths(value,path?`${path}.${key}`:key));
}
