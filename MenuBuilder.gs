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

function getVisibleMenus_() {
  const u=getSession_();
  return u ? getVisibleMenusForUser_(u) : [];
}

function getVisibleMenusForUser_(user) {
  const rows = readObjects_(MASTER_SHEETS.MENU);
  return rows.filter(m => String(m.active).toUpperCase() === 'TRUE' || m.active === true || String(m.active)==='1')
    .filter(m => String(m.roles||'').split(',').map(s=>s.trim()).includes(user.role))
    .sort((a,b)=>Number(a.urutan||0)-Number(b.urutan||0))
    .map(publicMenu_);
}

function publicMenu_(m) {
  return {
    id: String(m.id || ''), key: String(m.key || ''), label: String(m.label || ''),
    icon: String(m.icon || ''), handler: String(m.handler || ''), urutan: Number(m.urutan || 0),
    roles: String(m.roles || ''), active: m.active === true || String(m.active).toUpperCase() === 'TRUE' || String(m.active) === '1',
    config_json: String(m.config_json || '')
  };
}

function getMenuBuilder() {
  requireOwner_();
  return readObjects_(MASTER_SHEETS.MENU).map(publicMenu_);
}

function saveMenu(data) {
  requireOwner_();
  if (!data || typeof data !== 'object') throw new Error('INVALID_DATA');

  data = Object.assign({}, data);
  data.key = String(data.key || '').trim();
  data.label = String(data.label || '').trim();
  data.handler = String(data.handler || '').trim();
  data.icon = String(data.icon || '').trim();
  data.roles = Array.isArray(data.roles) ? data.roles.join(',') : String(data.roles || ROLE.OWNER);

  if (!data.key || !data.label || !data.handler) throw new Error('KEY_LABEL_HANDLER_REQUIRED');
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(data.key)) throw new Error('INVALID_MENU_KEY');
  if (!/^[A-Za-z_$][A-Za-z0-9_$]{0,99}$/.test(data.handler)) throw new Error('INVALID_MENU_HANDLER');

  const allowedRoles = Object.keys(ROLE);
  const roles = data.roles.split(',').map(s => s.trim()).filter(Boolean);
  if (!roles.length) throw new Error('MENU_ROLE_REQUIRED');
  if (roles.some(r => allowedRoles.indexOf(r) === -1)) throw new Error('INVALID_MENU_ROLE');
  data.roles = [...new Set(roles)].join(',');

  const activeText = String(data.active == null ? 'true' : data.active).toLowerCase();
  data.active = !(activeText === 'false' || activeText === '0' || activeText === 'no');

  const order = Number(data.urutan);
  data.urutan = Number.isFinite(order) ? order : 0;

  if (data.config_json) {
    try { JSON.parse(String(data.config_json)); }
    catch (e) { throw new Error('INVALID_CONFIG_JSON'); }
  } else {
    data.config_json = '';
  }

  const existing = readObjects_(MASTER_SHEETS.MENU).find(r =>
    String(r.key || '').trim().toLowerCase() === data.key.toLowerCase() && String(r.id || '') !== String(data.id || '')
  );
  if (existing) throw new Error('MENU_KEY_EXISTS');

  return saveMasterRow('MENU', data);
}

function deleteMenu(id) {
  return deleteMasterRow('MENU',id);
}
