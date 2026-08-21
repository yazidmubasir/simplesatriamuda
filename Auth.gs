/** Authentication and role authorization. */
function hashPassword_(password) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password), Utilities.Charset.UTF_8);
  return bytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}

function sessionCache_() {
  // UserCache is scoped to the current web-app user.
  return CacheService.getUserCache();
}

function login(username, password) {
  username = String(username || '').trim().toLowerCase();
  if (!username || password == null) return { ok: false, message: 'Username dan password wajib diisi.' };

  const rows = readObjects_(MASTER_SHEETS.USERS);
  const user = rows.find(r =>
    String(r.username || '').trim().toLowerCase() === username &&
    String(r.status || 'AKTIF').toUpperCase() === 'AKTIF'
  );

  if (!user || user.password_hash !== hashPassword_(password)) {
    return { ok: false, message: 'Username atau password salah.' };
  }

  const token = Utilities.getUuid();
  const payload = JSON.stringify(user);

  // Establish the active session during login itself.
  sessionCache_().put('SESSION_' + token, payload, 21600);
  sessionCache_().put('ACTIVE_TOKEN', token, 21600);

  // Compatibility fallback for existing deployments.
  try {
    PropertiesService.getUserProperties().setProperty('ACTIVE_TOKEN', token);
  } catch (e) {}

  updateById_(MASTER_SHEETS.USERS, user.id, { last_login: new Date() });

  return {
    ok: true,
    token: token,
    user: publicUser_(user),
    menus: getVisibleMenusForUser_(user)
  };
}

function logout(token) {
  const active = String(token || getActiveToken_() || '').trim();
  if (active) sessionCache_().remove('SESSION_' + active);
  sessionCache_().remove('ACTIVE_TOKEN');
  try { PropertiesService.getUserProperties().deleteProperty('ACTIVE_TOKEN'); } catch (e) {}
  return { ok: true };
}

function getActiveToken_() {
  let token = '';
  try { token = String(sessionCache_().get('ACTIVE_TOKEN') || '').trim(); } catch (e) {}
  if (token) return token;
  try { token = String(PropertiesService.getUserProperties().getProperty('ACTIVE_TOKEN') || '').trim(); } catch (e) {}
  return token;
}

function getSession_(token) {
  const t = String(token || getActiveToken_() || '').trim();
  if (!t) return null;

  let raw = null;
  try { raw = sessionCache_().get('SESSION_' + t); } catch (e) {}
  if (!raw) {
    try { raw = CacheService.getScriptCache().get('SESSION_' + t); } catch (e) {}
  }

  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function setActiveToken(token) {
  token = String(token || '').trim();
  if (!token) {
    clearActiveToken_();
    return null;
  }

  const user = getSession_(token);
  if (!user) throw new Error('AUTH_REQUIRED');

  sessionCache_().put('ACTIVE_TOKEN', token, 21600);
  try { PropertiesService.getUserProperties().setProperty('ACTIVE_TOKEN', token); } catch (e) {}
  return publicUser_(user);
}

function clearActiveToken_() {
  sessionCache_().remove('ACTIVE_TOKEN');
  try { PropertiesService.getUserProperties().deleteProperty('ACTIVE_TOKEN'); } catch (e) {}
}

function getPublicSession_() {
  const u = getSession_();
  return u ? publicUser_(u) : null;
}

function publicUser_(u) {
  return {
    id: u.id,
    username: u.username,
    nama: u.nama,
    role: u.role,
    kelas_id: u.kelas_id || '',
    guru_id: u.guru_id || '',
    karyawan_id: u.karyawan_id || '',
    siswa_id: u.siswa_id || ''
  };
}

function requireAuth_() {
  const u = getSession_();
  if (!u) throw new Error('AUTH_REQUIRED');
  return u;
}

function requireRole_(roles) {
  const u = requireAuth_();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (allowed.indexOf(u.role) === -1) throw new Error('FORBIDDEN');
  return u;
}

function requireOwner_() { return requireRole_(ROLE.OWNER); }

/** Initial OWNER: username yazid, password 12345. */
function seedOwner_() {
  const sheet = getMasterSpreadsheet_().getSheetByName(MASTER_SHEETS.USERS);
  const users = readObjects_(MASTER_SHEETS.USERS);
  if (users.some(u => String(u.role || '').toUpperCase() === ROLE.OWNER)) return;

  const owner = {
    id: Utilities.getUuid(),
    username: 'yazid',
    password_hash: hashPassword_('12345'),
    nama: 'Yazid',
    role: ROLE.OWNER,
    status: 'AKTIF',
    created_at: new Date(),
    updated_at: new Date()
  };
  appendObject_(sheet, owner);
}

function changeOwnPassword(oldPassword, newPassword) {
  const user = requireAuth_();
  if (!newPassword || String(newPassword).length < 5) throw new Error('PASSWORD_TOO_SHORT');

  const rows = readObjects_(MASTER_SHEETS.USERS);
  const current = rows.find(r => String(r.id) === String(user.id));
  if (!current || current.password_hash !== hashPassword_(oldPassword)) {
    throw new Error('OLD_PASSWORD_INVALID');
  }

  updateById_(MASTER_SHEETS.USERS, user.id, {
    password_hash: hashPassword_(newPassword),
    updated_at: new Date()
  });
  return { ok: true, message: 'Password berhasil diganti.' };
}
