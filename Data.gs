/** Generic data helpers and secure CRUD. */
function getMasterRows(entity) {
  const user = requireAuth_();
  if (!MASTER_SHEETS[entity] && MASTER_SHEETS[entity] !== entity) throw new Error('UNKNOWN_ENTITY');
  const sheetName = MASTER_SHEETS[entity] || entity;
  if (user.role !== ROLE.OWNER && ![MASTER_SHEETS.SISWA, MASTER_SHEETS.USERS].includes(sheetName)) throw new Error('FORBIDDEN');
  let rows = readObjects_(sheetName);
  if (user.role === ROLE.ADMIN_KELAS) {
    if (sheetName === MASTER_SHEETS.SISWA) rows = rows.filter(r => String(r.kelas_id) === String(user.kelas_id));
    if (sheetName === MASTER_SHEETS.USERS) rows = rows.filter(r => String(r.kelas_id) === String(user.kelas_id) || String(r.siswa_id || '') !== '');
  }
  return rows;
}

function saveMasterRow(entity, data) {
  const user = requireAuth_();
  const sheetName = MASTER_SHEETS[entity] || entity;
  if (!MASTER_SHEETS[entity] && sheetName !== entity) throw new Error('UNKNOWN_ENTITY');
  if (user.role !== ROLE.OWNER && sheetName !== MASTER_SHEETS.SISWA) throw new Error('FORBIDDEN');
  if (!data || typeof data !== 'object') throw new Error('INVALID_DATA');

  data = Object.assign({}, data);

  // Admin kelas can only write students belonging to their own class.
  if (user.role === ROLE.ADMIN_KELAS && sheetName === MASTER_SHEETS.SISWA) {
    data.kelas_id = String(user.kelas_id || '');
    if (!data.kelas_id) throw new Error('CLASS_SCOPE_MISSING');
    if (data.id) {
      const existing = readObjects_(MASTER_SHEETS.SISWA).find(r => String(r.id) === String(data.id));
      if (!existing || String(existing.kelas_id) !== String(user.kelas_id)) throw new Error('FORBIDDEN');
    }
  }

  // Never allow a client to write password_hash directly.
  // Password changes for users must go through the dedicated auth functions.
  if (sheetName === MASTER_SHEETS.USERS && Object.prototype.hasOwnProperty.call(data, 'password_hash')) {
    delete data.password_hash;
  }

  data.updated_at = new Date();

  // KELAS.sheet_name is generated server-side when creating a class.
  if (sheetName === MASTER_SHEETS.KELAS) {
    if (!data.id && !String(data.sheet_name || '').trim()) {
      data.sheet_name = makeClassSheetName_(data.kode, data.nama);
    }
    if (!String(data.sheet_name || '').trim()) throw new Error('CLASS_SHEET_NAME_REQUIRED');
    data.sheet_name = normalizeSheetName_(data.sheet_name);
  }

  if (!data.id) {
    data.id = Utilities.getUuid();
    data.created_at = new Date();
    const sheet = getMasterSpreadsheet_().getSheetByName(sheetName);
    if (!sheet) throw new Error('SHEET_NOT_FOUND');
    appendObject_(sheet, data);
  } else {
    updateById_(sheetName, data.id, data);
  }

  audit_(user, 'SAVE', sheetName, data.id, sanitizeAuditPayload_(sheetName, data));
  if (sheetName === MASTER_SHEETS.KELAS) createOrEnsureClassSheet_(data);
  return { ok: true, row: sanitizeClientRow_(sheetName, data) };
}

function deleteMasterRow(entity, id) {
  const user = requireOwner_();
  const sheetName = MASTER_SHEETS[entity] || entity;
  if (!sheetName || !id) throw new Error('INVALID_DELETE_REQUEST');
  deleteById_(sheetName, id);
  audit_(user, 'DELETE', sheetName, id, {});
  return { ok: true };
}

function readObjects_(sheetName) {
  const sh = getMasterSpreadsheet_().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  const range = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn());
  const values = range.getValues();
  const headers = values[0].map(parseColumnId_);
  return values.slice(1).filter(row => row.some(v => v !== '' && v != null)).map(row => {
    const o = {}; headers.forEach((h,i) => o[h] = row[i]); return o;
  });
}

function appendObject_(sheet, obj) {
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(parseColumnId_);
  sheet.appendRow(headers.map(h => obj[h] == null ? '' : obj[h]));
}

function updateById_(sheetName, id, data) {
  const sh = getMasterSpreadsheet_().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) throw new Error('ROW_NOT_FOUND');
  const vals = sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn()).getValues();
  const headers = vals[0].map(parseColumnId_);
  const idCol = headers.indexOf('id');
  if (idCol < 0) throw new Error('ID_COLUMN_MISSING');
  const rowIdx = vals.findIndex((r,i) => i > 0 && String(r[idCol]) === String(id));
  if (rowIdx === -1) throw new Error('ROW_NOT_FOUND');
  Object.keys(data).forEach(k => { const c = headers.indexOf(k); if (c >= 0) sh.getRange(rowIdx + 1, c + 1).setValue(data[k]); });
}

function deleteById_(sheetName, id) {
  const sh = getMasterSpreadsheet_().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) throw new Error('ROW_NOT_FOUND');
  const vals = sh.getRange(1,1,sh.getLastRow(),Math.max(sh.getLastColumn(),1)).getValues();
  const headers = vals[0].map(parseColumnId_);
  const idCol = headers.indexOf('id');
  if (idCol < 0) throw new Error('ID_COLUMN_MISSING');
  const idx = vals.findIndex((r,i)=>i>0&&String(r[idCol])===String(id));
  if(idx<0) throw new Error('ROW_NOT_FOUND');
  sh.deleteRow(idx+1);
}

function makeClassSheetName_(kode, nama) {
  const base = String(kode || nama || 'KELAS').trim().toUpperCase();
  const clean = base.replace(/[^A-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 70);
  return normalizeSheetName_('KELAS_' + (clean || Utilities.getUuid().slice(0,8)));
}

function normalizeSheetName_(name) {
  let s = String(name || '').trim().replace(/[\\/?*\[\]:]/g, '_');
  s = s.substring(0, 90).trim();
  if (!s) throw new Error('INVALID_SHEET_NAME');
  return s;
}

function sanitizeClientRow_(sheetName, data) {
  const row = Object.assign({}, data);
  if (sheetName === MASTER_SHEETS.USERS) delete row.password_hash;
  return row;
}

function sanitizeAuditPayload_(sheetName, data) {
  const payload = Object.assign({}, data);
  if (sheetName === MASTER_SHEETS.USERS) delete payload.password_hash;
  return payload;
}

function audit_(user, action, target, targetId, payload) {
  try {
    appendObject_(getMasterSpreadsheet_().getSheetByName(MASTER_SHEETS.AUDIT), {
      id:Utilities.getUuid(), actor_user_id:user.id, action, target, target_id:targetId,
      payload_json:JSON.stringify(payload||{}), created_at:new Date()
    });
  } catch(e) {}
}
