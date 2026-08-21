/**
 * MASTER KELAS configuration.
 * A KELAS points to one Google Spreadsheet. Activity sheet names belong
 * to that spreadsheet and are managed by ClassSheetBuilder.gs.
 */
function saveKelasConfig(data){
  const user=requireOwner_();
  if(!data||typeof data!=='object')throw new Error('INVALID_DATA');

  const id=String(data.id||'').trim();
  const spreadsheetId=String(data.spreadsheet_id||'').trim();
  const adminUserId=String(data.admin_user_id||'').trim();
  const status=String(data.status||'AKTIF').trim().toUpperCase();
  if(!spreadsheetId)throw new Error('SPREADSHEET_ID_REQUIRED');
  if(!['AKTIF','NONAKTIF'].includes(status))throw new Error('INVALID_STATUS');

  let ss;
  try{ss=SpreadsheetApp.openById(spreadsheetId)}catch(e){throw new Error('SPREADSHEET_ACCESS_DENIED')}

  const sh=getMasterSpreadsheet_().getSheetByName(MASTER_SHEETS.KELAS);
  if(!sh)throw new Error('MASTER_KELAS_NOT_FOUND');
  const rows=readObjects_(MASTER_SHEETS.KELAS);
  const duplicate=rows.find(r=>String(r.spreadsheet_id||'').trim()===spreadsheetId&&String(r.id)!==id);
  if(duplicate)throw new Error('SPREADSHEET_ALREADY_REGISTERED');

  if(id){
    const existing=findMasterById_(MASTER_SHEETS.KELAS,id);
    if(!existing)throw new Error('KELAS_NOT_FOUND');
    updateById_(MASTER_SHEETS.KELAS,id,{
      spreadsheet_id:spreadsheetId,
      admin_user_id:adminUserId,
      status:status,
      updated_at:new Date()
    });
    audit_(user,'CONFIGURE',MASTER_SHEETS.KELAS,id,{spreadsheet_id:spreadsheetId,spreadsheet_name:ss.getName(),admin_user_id:adminUserId,status:status});
    return {ok:true,row:sanitizeClientRow_(MASTER_SHEETS.KELAS,findMasterById_(MASTER_SHEETS.KELAS,id)),spreadsheet_name:ss.getName()};
  }

  const now=new Date();
  const row={
    id:Utilities.getUuid(),
    spreadsheet_id:spreadsheetId,
    admin_user_id:adminUserId,
    status:status,
    created_at:now,
    updated_at:now
  };
  appendObject_(sh,row);
  audit_(user,'CREATE',MASTER_SHEETS.KELAS,row.id,{spreadsheet_id:spreadsheetId,spreadsheet_name:ss.getName(),admin_user_id:adminUserId,status:status});
  return {ok:true,row:sanitizeClientRow_(MASTER_SHEETS.KELAS,row),spreadsheet_name:ss.getName()};
}
