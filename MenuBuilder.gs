/** Owner-controlled menu builder. */
function seedDefaultMenu_() {
  const rows = readObjects_(MASTER_SHEETS.MENU);
  if (rows.some(r => r.key === APP.defaultMenu)) return;
  appendObject_(getMasterSpreadsheet_().getSheetByName(MASTER_SHEETS.MENU), {
    id: Utilities.getUuid(), key: '7kaih', label: '7KAIH', icon: 'bi-grid-3x3-gap', handler: 'render7KAIH',
    urutan: 1, roles: 'OWNER,ADMIN_KELAS,GURU,KARYAWAN,SISWA', active: true,
    config_json: JSON.stringify({description:'Modul 7 Kebiasaan Anak Indonesia Hebat'}), created_at:new Date(), updated_at:new Date()
  });
}
function seedSystemConfig_() {
  const rows = readObjects_(MASTER_SHEETS.CONFIG);
  if (!rows.some(r => r.key === 'SYSTEM_VERSION')) appendObject_(getMasterSpreadsheet_().getSheetByName(MASTER_SHEETS.CONFIG), {id:Utilities.getUuid(),key:'SYSTEM_VERSION',value:APP.version,updated_at:new Date()});
}
function getVisibleMenus_() { const u=getSession_(); return u ? getVisibleMenusForUser_(u) : []; }
function getVisibleMenusForUser_(user) {
  const rows = readObjects_(MASTER_SHEETS.MENU);
  return rows.filter(m => String(m.active).toUpperCase() === 'TRUE' || m.active === true || String(m.active)==='1')
    .filter(m => String(m.roles||'').split(',').map(s=>s.trim()).includes(user.role))
    .sort((a,b)=>Number(a.urutan||0)-Number(b.urutan||0));
}
function getMenuBuilder() { requireOwner_(); return readObjects_(MASTER_SHEETS.MENU); }
function saveMenu(data) { const u=requireOwner_(); if(!data.key||!data.label||!data.handler) throw new Error('KEY_LABEL_HANDLER_REQUIRED'); data.roles=Array.isArray(data.roles)?data.roles.join(','):String(data.roles||ROLE.OWNER); return saveMasterRow('MENU',data); }
function deleteMenu(id) { return deleteMasterRow('MENU',id); }
