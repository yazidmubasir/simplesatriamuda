/** Admin kelas scope. Owner controls MASTER_KELAS and MASTER_USERS. */

function resolveMyClass_() {
  const u = requireRole_([ROLE.ADMIN_KELAS, ROLE.GURU]);
  const classes = readObjects_(MASTER_SHEETS.KELAS);
  const kelasId = String(u.kelas_id || '').trim();

  // Current schema: MASTER_USERS.kelas_id -> MASTER_KELAS.id.
  let cls = classes.find(k => String(k.id || '').trim() === kelasId);

  // Compatibility for accounts created before the current relation schema.
  if (!cls && kelasId) {
    cls = classes.find(k => String(k.kode || '').trim() === kelasId);
  }
  if (!cls && u.id) {
    cls = classes.find(k => String(k.admin_user_id || '').trim() === String(u.id).trim());
  }
  return cls || null;
}

function getMyClass() {
  const cls = resolveMyClass_();
  if (!cls) return null;
  return {
    id: cls.id || '',
    kode: cls.kode || '',
    nama: cls.nama || '',
    sheet_name: cls.sheet_name || '',
    admin_user_id: cls.admin_user_id || '',
    status: cls.status || 'AKTIF'
  };
}

function getMyStudents() {
  requireRole_([ROLE.ADMIN_KELAS, ROLE.GURU]);
  const cls = resolveMyClass_();
  if (!cls) return [];

  // Current schema: MASTER_SISWA.kelas_id -> MASTER_KELAS.kode.
  const classCode = String(cls.kode || '').trim();
  if (!classCode) return [];

  return readObjects_(MASTER_SHEETS.SISWA)
    .filter(s => String(s.kelas_id || '').trim() === classCode)
    .map(s => sanitizeClientRow_(MASTER_SHEETS.SISWA, s));
}

function saveMyStudent(data) {
  requireRole_(ROLE.ADMIN_KELAS);
  if (!data || typeof data !== 'object') throw new Error('INVALID_DATA');

  const cls = resolveMyClass_();
  if (!cls) throw new Error('KELAS_NOT_FOUND');
  const classCode = String(cls.kode || '').trim();
  if (!classCode) throw new Error('KELAS_CODE_MISSING');

  const payload = Object.assign({}, data, { kelas_id: classCode });

  if (payload.id) {
    const existing = readObjects_(MASTER_SHEETS.SISWA)
      .find(s => String(s.id || '') === String(payload.id));
    if (!existing || String(existing.kelas_id || '').trim() !== classCode) {
      throw new Error('FORBIDDEN');
    }
  }

  return saveMasterRow('SISWA', payload);
}

function deleteMyStudent(id) {
  requireRole_(ROLE.ADMIN_KELAS);
  const cls = resolveMyClass_();
  if (!cls) throw new Error('KELAS_NOT_FOUND');
  const classCode = String(cls.kode || '').trim();

  const row = readObjects_(MASTER_SHEETS.SISWA)
    .find(s => String(s.id || '') === String(id));
  if (!row || String(row.kelas_id || '').trim() !== classCode) throw new Error('FORBIDDEN');

  // Keep school data recoverable: soft delete.
  return saveMasterRow('SISWA', { id: id, status: 'NONAKTIF' });
}

function getMyClassSheetData() {
  const u = requireRole_([ROLE.ADMIN_KELAS, ROLE.GURU, ROLE.SISWA]);
  const kelasId = String(u.kelas_id || '').trim();
  const classes = readObjects_(MASTER_SHEETS.KELAS);
  let cls = classes.find(k => String(k.id || '').trim() === kelasId);
  if (!cls && kelasId) cls = classes.find(k => String(k.kode || '').trim() === kelasId);
  if (!cls && u.id) cls = classes.find(k => String(k.admin_user_id || '').trim() === String(u.id).trim());

  if (!cls) return { ok: false, headers: [], rows: [], message: 'KELAS_NOT_FOUND' };

  const sheetName = String(cls.sheet_name || '').trim();
  if (!sheetName) return { ok: true, headers: [], rows: [], message: 'SHEET_NOT_CONFIGURED' };

  const sh = getMasterSpreadsheet_().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 1) return { ok: true, headers: [], rows: [] };

  const values = sh.getDataRange().getDisplayValues();
  return {
    ok: true,
    class: {
      id: cls.id || '',
      kode: cls.kode || '',
      nama: cls.nama || '',
      sheet_name: sheetName
    },
    headers: values.length ? values.shift().map(parseColumnId_) : [],
    rows: values
  };
}
