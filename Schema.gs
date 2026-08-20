/**
 * Schema utilities.
 * Every logical column has a stable column_id. Headers are stored as
 * COLUMN_ID::Label so labels may change without changing code references.
 */
function ensureAllMasterSheets_() {
  const ss = getMasterSpreadsheet_();
  Object.keys(MASTER_SCHEMA).forEach(key => ensureSheetSchema_(ss, key, MASTER_SCHEMA[key]));
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

function createOrEnsureClassSheet_(kelas) {
  const ss = getMasterSpreadsheet_();
  const sheetName = sanitizeSheetName_(kelas.sheet_name || ('KELAS_' + kelas.kode));
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);
  const baseSchema = [
    ['id','ID','TEXT'], ['kelas_id','Kelas ID','TEXT'], ['siswa_id','Siswa ID','TEXT'],
    ['tanggal','Tanggal','DATE'], ['mapel_id','Mapel ID','TEXT'], ['guru_id','Guru ID','TEXT'],
    ['created_by','Dibuat Oleh','TEXT'], ['created_at','Dibuat','DATETIME'], ['updated_at','Diubah','DATETIME']
  ];
  ensureColumns_(sh, baseSchema);
  return sh.getName();
}

function sanitizeSheetName_(name) {
  let s = String(name || 'KELAS').replace(/[\\/?*\[\]:]/g, '-').trim();
  if (!s) s = 'KELAS';
  return s.substring(0, 100);
}
