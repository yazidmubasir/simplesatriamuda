/** One-time owner recovery utility. Run manually from Apps Script. */
function resetOwnerYazid_() {
  const ss = getMasterSpreadsheet_();
  const sheet = ss.getSheetByName(MASTER_SHEETS.USERS);
  if (!sheet) throw new Error('MASTER_USERS belum ada. Jalankan bootstrapSystem terlebih dahulu.');
  const rows = readObjects_(MASTER_SHEETS.USERS);
  const ownerRows = rows.filter(r => String(r.role || '').toUpperCase() === ROLE.OWNER);
  if (!ownerRows.length) {
    seedOwner_();
    return { ok: true, message: 'OWNER yazid berhasil dibuat.' };
  }
  const owner = ownerRows[0];
  updateById_(MASTER_SHEETS.USERS, owner.id, {
    username: 'yazid',
    password_hash: hashPassword_('12345'),
    nama: 'Yazid',
    role: ROLE.OWNER,
    status: 'AKTIF',
    updated_at: new Date()
  });
  return { ok: true, message: 'OWNER berhasil direset menjadi yazid / 12345.' };
}
