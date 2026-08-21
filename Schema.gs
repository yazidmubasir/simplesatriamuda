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

/** Remove obsolete Kelas metadata columns left by older versions. */
function migrateMasterKelasSchema_() {
  const sh=getMasterSpreadsheet_().getSheetByName(MASTER_SHEETS.KELAS);
  if(!sh||sh.getLastColumn()<1)return;
  const obsolete=new Set(['kode','nama','sheet_name']);
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(parseColumnId_);
  for(let i=headers.length-1;i>=0;i--){
    if(obsolete.has(headers[i]))sh.deleteColumn(i+1);
  }
  ensureColumns_(sh,MASTER_SCHEMA[MASTER_SHEETS.KELAS]);
}

/** Deprecated: class activity sheets are no longer stored in MASTER. */
function createOrEnsureClassSheet_(kelas) {
  throw new Error('CLASS_ACTIVITY_SHEETS_MUST_BE_MANAGED_IN_CLASS_SPREADSHEET');
}
