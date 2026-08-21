/**
 * Owner-only builder for activity sheets in each class spreadsheet.
 * MASTER_KELAS.spreadsheet_id points to the class spreadsheet.
 * Sheet headers use COLUMN_ID::Label and each logical column has a stable id.
 */

function ensureKelasSpreadsheetField_() {
  const ss = getMasterSpreadsheet_();
  const sh = ss.getSheetByName(MASTER_SHEETS.KELAS);
  if (!sh) throw new Error('MASTER_KELAS_NOT_FOUND');
  const headers = sh.getRange(1,1,1,Math.max(sh.getLastColumn(),1)).getValues()[0].map(parseColumnId_);
  if (headers.indexOf('spreadsheet_id') === -1) {
    const c = sh.getLastColumn() + 1;
    sh.getRange(1,c).setValue('spreadsheet_id::ID Spreadsheet Kelas');
    sh.getRange(1,c).setNote('ID Google Spreadsheet yang digunakan untuk sheet kegiatan siswa.');
  }
}

function getClassSpreadsheetSheets(kelasId) {
  requireOwner_();
  ensureKelasSpreadsheetField_();
  const kelas = findMasterById_(MASTER_SHEETS.KELAS, kelasId);
  if (!kelas) throw new Error('KELAS_NOT_FOUND');
  const spreadsheetId = String(kelas.spreadsheet_id || '').trim();
  if (!spreadsheetId) return {ok:true, spreadsheet_id:'', sheets:[], message:'SPREADSHEET_ID_EMPTY'};
  let ss;
  try { ss = SpreadsheetApp.openById(spreadsheetId); }
  catch (e) { throw new Error('SPREADSHEET_ACCESS_DENIED'); }
  return {
    ok:true,
    spreadsheet_id:spreadsheetId,
    spreadsheet_name:ss.getName(),
    sheets:ss.getSheets().map(sh => ({name:sh.getName(), rows:sh.getLastRow(), columns:sh.getLastColumn()}))
  };
}

function saveClassSpreadsheet(kelasId, spreadsheetId) {
  const user = requireOwner_();
  ensureKelasSpreadsheetField_();
  const id = String(spreadsheetId || '').trim();
  if (!id) throw new Error('SPREADSHEET_ID_REQUIRED');
  let ss;
  try { ss = SpreadsheetApp.openById(id); }
  catch (e) { throw new Error('SPREADSHEET_ACCESS_DENIED'); }
  const kelas = findMasterById_(MASTER_SHEETS.KELAS, kelasId);
  if (!kelas) throw new Error('KELAS_NOT_FOUND');
  updateById_(MASTER_SHEETS.KELAS, kelasId, {spreadsheet_id:id, updated_at:new Date()});
  audit_(user,'CONFIGURE',MASTER_SHEETS.KELAS,kelasId,{spreadsheet_id:id,spreadsheet_name:ss.getName()});
  return {ok:true, spreadsheet_id:id, spreadsheet_name:ss.getName()};
}

function getActivitySheetSchema(kelasId, sheetName) {
  requireOwner_();
  const sheets = getClassSpreadsheetSheets(kelasId);
  const name = String(sheetName || '').trim();
  if (!name) throw new Error('SHEET_REQUIRED');
  if (!sheets.sheets.some(s => s.name === name)) throw new Error('SHEET_NOT_FOUND');
  const ss = SpreadsheetApp.openById(sheets.spreadsheet_id);
  const sh = ss.getSheetByName(name);
  const headers = sh.getLastColumn() ? sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0] : [];
  return {
    ok:true,
    spreadsheet_id:sheets.spreadsheet_id,
    spreadsheet_name:ss.getName(),
    sheet_name:name,
    columns:headers.map((h,i)=>({position:i+1,raw:h,column_id:parseColumnId_(h),label:String(h).includes('::')?String(h).split('::').slice(1).join('::').trim():String(h),active:!!String(h).trim()}))
  };
}

function saveActivitySheetSchema(kelasId, sheetName, columns) {
  const user = requireOwner_();
  const sheets = getClassSpreadsheetSheets(kelasId);
  const name = String(sheetName || '').trim();
  if (!name) throw new Error('SHEET_REQUIRED');
  if (!sheets.sheets.some(s => s.name === name)) throw new Error('SHEET_NOT_FOUND');
  if (!Array.isArray(columns)) throw new Error('COLUMNS_REQUIRED');

  const cleaned=[];
  const seen={};
  columns.forEach((c,i)=>{
    const id=String(c?.column_id||'').trim().toLowerCase().replace(/[^a-z0-9_]+/g,'_').replace(/^_+|_+$/g,'');
    const label=String(c?.label||'').trim();
    if (!id && !label) return;
    if (!id) throw new Error('COLUMN_ID_REQUIRED_AT_'+(i+1));
    if (!label) throw new Error('COLUMN_LABEL_REQUIRED_AT_'+(i+1));
    if (seen[id]) throw new Error('DUPLICATE_COLUMN_ID_'+id);
    seen[id]=true;
    cleaned.push({id,label,type:String(c?.type||'TEXT').toUpperCase(),required:!!c?.required});
  });

  const ss=SpreadsheetApp.openById(sheets.spreadsheet_id);
  const sh=ss.getSheetByName(name);
  if (!sh) throw new Error('SHEET_NOT_FOUND');

  // Do not delete existing data. Header structure is updated only in row 1.
  const requiredCols=Math.max(cleaned.length,1);
  if (sh.getMaxColumns()<requiredCols) sh.insertColumnsAfter(sh.getMaxColumns(),requiredCols-sh.getMaxColumns());
  const oldLast=Math.max(sh.getLastColumn(),1);
  const existing=sh.getRange(1,1,1,Math.max(oldLast,requiredCols)).getDisplayValues()[0];
  const oldById={};
  existing.forEach((h,i)=>{const id=parseColumnId_(h);if(id)oldById[id]=i+1;});

  // Rebuild row 1 in the requested order; move/copy existing columns when possible.
  const maxCols=Math.max(sh.getMaxColumns(),cleaned.length,oldLast);
  const dataRows=Math.max(sh.getLastRow()-1,0);
  const oldValues=dataRows?sh.getRange(2,1,dataRows,oldLast).getValues():[];
  const out=[];
  cleaned.forEach(c=>{
    const col=oldById[c.id];
    out.push(col && dataRows ? oldValues.map(r=>r[col-1]) : Array(dataRows).fill(''));
  });
  if (cleaned.length) {
    sh.getRange(1,1,1,cleaned.length).setValues([cleaned.map(c=>c.id+'::'+c.label)]);
    cleaned.forEach((c,i)=>sh.getRange(1,i+1).setNote('column_id='+c.id+' | type='+c.type+' | required='+c.required));
    if (dataRows) out.forEach((arr,i)=>sh.getRange(2,i+1,dataRows,1).setValues(arr.map(v=>[v])));
  } else {
    sh.getRange(1,1,1,Math.max(oldLast,1)).clearContent();
  }
  sh.setFrozenRows(1);
  audit_(user,'CONFIGURE',name,kelasId,{spreadsheet_id:sheets.spreadsheet_id,columns:cleaned});
  return getActivitySheetSchema(kelasId,name);
}
