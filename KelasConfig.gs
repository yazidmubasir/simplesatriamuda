/**
 * MASTER KELAS configuration.
 * A KELAS points to one Google Spreadsheet. Activity sheet names belong
 * to that spreadsheet and are managed by ClassSheetBuilder.gs.
 */
function saveKelasConfig(data){
  const user=requireOwner_();
  if(!data||typeof data!=='object')throw new Error('INVALID_DATA');

  const id=String(data.id||'').trim();
  const kelas=String(data.kelas||'').trim();
  const spreadsheetId=String(data.spreadsheet_id||'').trim();
  const status=String(data.status||'AKTIF').trim().toUpperCase();
  if(!kelas)throw new Error('KELAS_REQUIRED');
  if(kelas.length>100)throw new Error('KELAS_TOO_LONG');
  if(!spreadsheetId)throw new Error('SPREADSHEET_ID_REQUIRED');
  if(!['AKTIF','NONAKTIF'].includes(status))throw new Error('INVALID_STATUS');

  let ss;
  try{ss=SpreadsheetApp.openById(spreadsheetId)}catch(e){throw new Error('SPREADSHEET_ACCESS_DENIED')}

  const sh=getMasterSpreadsheet_().getSheetByName(MASTER_SHEETS.KELAS);
  if(!sh)throw new Error('MASTER_KELAS_NOT_FOUND');
  const rows=readObjects_(MASTER_SHEETS.KELAS);
  const duplicateSpreadsheet=rows.find(r=>String(r.spreadsheet_id||'').trim()===spreadsheetId&&String(r.id)!==id);
  if(duplicateSpreadsheet)throw new Error('SPREADSHEET_ALREADY_REGISTERED');
  const duplicateKelas=rows.find(r=>String(r.kelas||'').trim().toLowerCase()===kelas.toLowerCase()&&String(r.id)!==id);
  if(duplicateKelas)throw new Error('KELAS_ALREADY_REGISTERED');

  if(id){
    const existing=findMasterById_(MASTER_SHEETS.KELAS,id);
    if(!existing)throw new Error('KELAS_NOT_FOUND');
    updateById_(MASTER_SHEETS.KELAS,id,{
      kelas:kelas,
      spreadsheet_id:spreadsheetId,
      status:status,
      updated_at:new Date()
    });
    audit_(user,'CONFIGURE',MASTER_SHEETS.KELAS,id,{kelas:kelas,spreadsheet_id:spreadsheetId,spreadsheet_name:ss.getName(),status:status});
    return {ok:true,row:sanitizeClientRow_(MASTER_SHEETS.KELAS,findMasterById_(MASTER_SHEETS.KELAS,id)),spreadsheet_name:ss.getName()};
  }

  const now=new Date();
  const row={
    id:Utilities.getUuid(),
    kelas:kelas,
    spreadsheet_id:spreadsheetId,
    status:status,
    created_at:now,
    updated_at:now
  };
  appendObject_(sh,row);
  audit_(user,'CREATE',MASTER_SHEETS.KELAS,row.id,{kelas:kelas,spreadsheet_id:spreadsheetId,spreadsheet_name:ss.getName(),status:status});
  return {ok:true,row:sanitizeClientRow_(MASTER_SHEETS.KELAS,row),spreadsheet_name:ss.getName()};
}
