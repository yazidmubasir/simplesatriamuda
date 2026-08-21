/**
 * Schema utilities.
 * Every logical column has a stable column_id. Headers are stored as
 * COLUMN_ID::Label so labels may change without changing code references.
 */
function ensureAllMasterSheets_() {
  const ss = getMasterSpreadsheet_();
  Object.keys(MASTER_SCHEMA).forEach(key => ensureSheetSchema_(ss, key, MASTER_SCHEMA[key]));
  migrateMasterKelasSchema_();
}

function ensureSheetSchema_(ss, sheetName, schema) {
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);
  ensureColumns_(sh, schema);
  return sh;
}

function ensureColumns_(sheet, schema) {
  if (!schema || !schema.length) return;
  const maxCols = Math.max(sheet.getMaxColumns(), schema.length);
  if (sheet.getMaxColumns() < maxCols) sheet.insertColumnsAfter(sheet.getMaxColumns(), maxCols - sheet.getMaxColumns());
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, Math.max(lastCol, schema.length)).getValues()[0].map(String);
  const ids = headers.map(parseColumnId_);
  schema.forEach(([id, label]) => {
    if (ids.indexOf(id) === -1) {
      const col = sheet.getLastColumn() + 1;
      sheet.getRange(1, col).setValue(id + '::' + label);
      sheet.getRange(1, col).setNote('column_id=' + id);
    }
  });
  const finalHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  if (!finalHeaders.some(Boolean)) {
    schema.forEach(([id, label], i) => sheet.getRange(1, i + 1).setValue(id + '::' + label));
  }
  sheet.setFrozenRows(1);
}

function parseColumnId_(header) {
  const h = String(header || '').trim();
  return h.includes('::') ? h.split('::')[0].trim() : h;
}

function getSchemaBySheetName_(sheetName) {
  const key = Object.keys(MASTER_SCHEMA).find(k => k === sheetName);
  return key ? MASTER_SCHEMA[key] : null;
}

/**
 * Migrate MASTER_KELAS to the exact current structure and order.
 * Old columns kode, nama and sheet_name are removed. The new Kelas field
 * is placed immediately after ID, before spreadsheet_id.
 */
function migrateMasterKelasSchema_() {
  const sh=getMasterSpreadsheet_().getSheetByName(MASTER_SHEETS.KELAS);
  const schema=MASTER_SCHEMA[MASTER_SHEETS.KELAS];
  if(!sh||!schema||!schema.length)return;

  const lastRow=Math.max(sh.getLastRow(),1);
  const lastCol=Math.max(sh.getLastColumn(),1);
  const raw=sh.getRange(1,1,lastRow,lastCol).getValues();
  const headers=(raw[0]||[]).map(parseColumnId_);
  const indexById={};
  headers.forEach((id,i)=>{if(id&&!Object.prototype.hasOwnProperty.call(indexById,id))indexById[id]=i;});

  const desiredIds=schema.map(x=>x[0]);
  const obsolete=new Set(['kode','nama','sheet_name']);

  // Preserve all valid current data, including legacy data that maps to kelas.
  const output=[schema.map(x=>x[0]+'::'+x[1])];
  for(let r=1;r<raw.length;r++){
    const source=raw[r]||[];
    const row=desiredIds.map(id=>{
      const idx=indexById[id];
      if(idx==null)return '';
      return source[idx];
    });
    if(row.some(v=>String(v??'').trim()!==''))output.push(row);
  }

  // If an older version used nama as the class name, migrate it into kelas.
  const namaIndex=indexById.nama;
  const kelasIndex=desiredIds.indexOf('kelas');
  if(namaIndex!=null&&kelasIndex>=0){
    for(let r=1;r<output.length;r++){
      if(!String(output[r][kelasIndex]??'').trim()){
        const source=raw[r]||[];
        output[r][kelasIndex]=source[namaIndex]??'';
      }
    }
  }

  // Rewrite the sheet in the exact desired order.
  if(sh.getMaxColumns()<schema.length){
    sh.insertColumnsAfter(sh.getMaxColumns(),schema.length-sh.getMaxColumns());
  }
  sh.clearContents();
  sh.getRange(1,1,output.length,schema.length).setValues(output);
  if(sh.getMaxColumns()>schema.length){
    sh.deleteColumns(schema.length+1,sh.getMaxColumns()-schema.length);
  }
  sh.setFrozenRows(1);
  schema.forEach(([id,label],i)=>sh.getRange(1,i+1).setNote('column_id='+id));
}

/** Deprecated: class activity sheets are no longer stored in MASTER. */
function createOrEnsureClassSheet_(kelas) {
  throw new Error('CLASS_ACTIVITY_SHEETS_MUST_BE_MANAGED_IN_CLASS_SPREADSHEET');
}
