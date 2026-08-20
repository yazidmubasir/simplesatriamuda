/** Admin kelas scope. Owner still controls MASTER_KELAS and MASTER_USERS. */
function getMyClass() {
  const u = requireRole_([ROLE.ADMIN_KELAS, ROLE.GURU]);
  return readObjects_(MASTER_SHEETS.KELAS).find(k => String(k.id) === String(u.kelas_id)) || null;
}
function getMyStudents() {
  const u = requireRole_([ROLE.ADMIN_KELAS, ROLE.GURU]);
  return readObjects_(MASTER_SHEETS.SISWA).filter(s => String(s.kelas_id) === String(u.kelas_id));
}
function saveMyStudent(data) {
  const u = requireRole_(ROLE.ADMIN_KELAS);
  if (!data || String(data.kelas_id) !== String(u.kelas_id)) throw new Error('FORBIDDEN');
  return saveMasterRow('SISWA', data);
}
function deleteMyStudent(id) {
  const u = requireRole_(ROLE.ADMIN_KELAS);
  const row = readObjects_(MASTER_SHEETS.SISWA).find(s=>String(s.id)===String(id));
  if (!row || String(row.kelas_id)!==String(u.kelas_id)) throw new Error('FORBIDDEN');
  // Soft delete is safer for school data.
  return saveMasterRow('SISWA', {id:id, status:'NONAKTIF'});
}
function getMyClassSheetData() {
  const u = requireRole_([ROLE.ADMIN_KELAS, ROLE.GURU, ROLE.SISWA]);
  const cls = readObjects_(MASTER_SHEETS.KELAS).find(k=>String(k.id)===String(u.kelas_id));
  if (!cls) return {ok:false, rows:[]};
  const sh = getMasterSpreadsheet_().getSheetByName(cls.sheet_name);
  if (!sh || sh.getLastRow()<1) return {ok:true, headers:[], rows:[]};
  const values = sh.getDataRange().getDisplayValues();
  return {ok:true, headers: values.shift().map(parseColumnId_), rows: values};
}
