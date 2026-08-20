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
  if (user.role !== ROLE.OWNER && sheetName !== MASTER_SHEETS.SISWA) throw new Error('FORBIDDEN');
  if (user.role === ROLE.ADMIN_KELAS && sheetName === MASTER_SHEETS.SISWA && String(data.kelas_id) !== String(user.kelas_id)) throw new Error('FORBIDDEN');
  data = Object.assign({}, data, { updated_at: new Date() });
  if (!data.id) {
    data.id = Utilities.getUuid();
    data.created_at = new Date();
    appendObject_(getMasterSpreadsheet_().getSheetByName(sheetName), data);
  } else {
    updateById_(sheetName, data.id, data);
  }
  audit_(user, 'SAVE', sheetName, data.id, data);
  if (sheetName === MASTER_SHEETS.KELAS) createOrEnsureClassSheet_(data);
  return { ok: true, row: data };
}

function deleteMasterRow(entity, id) {
  const user = requireOwner_();
  const sheetName = MASTER_SHEETS[entity] || entity;
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
  const rowIdx = vals.findIndex((r,i) => i > 0 && String(r[idCol]) === String(id));
  if (rowIdx === -1) throw new Error('ROW_NOT_FOUND');
  Object.keys(data).forEach(k => { const c = headers.indexOf(k); if (c >= 0) sh.getRange(rowIdx + 1, c + 1).setValue(data[k]); });
}
function deleteById_(sheetName, id) {
  const sh = getMasterSpreadsheet_().getSheetByName(sheetName); if (!sh) throw new Error('SHEET_NOT_FOUND');
  const vals = sh.getRange(1,1,sh.getLastRow(),Math.max(sh.getLastColumn(),1)).getValues(); const headers = vals[0].map(parseColumnId_);
  const idCol = headers.indexOf('id'); const idx = vals.findIndex((r,i)=>i>0&&String(r[idCol])===String(id)); if(idx<0) throw new Error('ROW_NOT_FOUND'); sh.deleteRow(idx+1);
}
function audit_(user, action, target, targetId, payload) {
  try { appendObject_(getMasterSpreadsheet_().getSheetByName(MASTER_SHEETS.AUDIT), {id:Utilities.getUuid(), actor_user_id:user.id, action, target, target_id:targetId, payload_json:JSON.stringify(payload||{}), created_at:new Date()}); } catch(e) {}
}
