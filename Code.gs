/**
 * SIM SATRIA CLASS BUILDER
 * Core controller.
 */
const APP = Object.freeze({
  name: 'SIM SATRIA',
  version: '1.0.0',
  defaultMenu: '7kaih'
});

function doGet() {
  const index = HtmlService.createTemplateFromFile('Index').evaluate().getContent();
  const enhancement = HtmlService.createHtmlOutputFromFile('BuilderEnhancement').getContent();
  return HtmlService.createHtmlOutput(index.replace('</body>', enhancement + '</body>'))
    .setTitle(APP.name)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function bootstrapSystem() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    ensureMasterSpreadsheet_();
    ensureAllMasterSheets_();
    seedOwner_();
    seedDefaultMenu_();
    seedSystemConfig_();
    return { ok: true, message: 'Sistem MASTER berhasil dibuat/diperiksa.' };
  } finally {
    lock.releaseLock();
  }
}

/** Compatibility wrapper used by bootstrapSystem(). */
function ensureMasterSpreadsheet_() {
  return getOrCreateMasterSpreadsheet_();
}

function getAppState() {
  return {
    app: APP,
    authenticated: !!getSession_(),
    session: getPublicSession_(),
    menus: getVisibleMenus_()
  };
}
