/** Central configuration. */
const MASTER_SHEETS = Object.freeze({CONFIG:'MASTER_CONFIG',USERS:'MASTER_USERS',GURU:'MASTER_GURU',KARYAWAN:'MASTER_KARYAWAN',SISWA:'MASTER_SISWA',KELAS:'MASTER_KELAS',MAPEL:'MASTER_MAPEL',MENU:'MASTER_MENU',COLUMNS:'MASTER_COLUMNS',AUDIT:'MASTER_AUDIT'});
const ROLE = Object.freeze({OWNER:'OWNER',ADMIN_KELAS:'ADMIN_KELAS',GURU:'GURU',KARYAWAN:'KARYAWAN',SISWA:'SISWA'});
const MASTER_SCHEMA = Object.freeze({
MASTER_CONFIG:[['id','ID','TEXT'],['key','Kunci','TEXT'],['value','Nilai','TEXT'],['updated_at','Diperbarui','DATETIME']],
MASTER_USERS:[['id','ID','TEXT'],['username','Username','TEXT'],['password_hash','Password Hash','TEXT'],['nama','Nama','TEXT'],['role','Role','TEXT'],['kelas_id','Kelas ID','TEXT'],['guru_id','Guru ID','TEXT'],['karyawan_id','Karyawan ID','TEXT'],['siswa_id','Siswa ID','TEXT'],['status','Status','TEXT'],['last_login','Login Terakhir','DATETIME'],['created_at','Dibuat','DATETIME'],['updated_at','Diubah','DATETIME']],
MASTER_GURU:[['id','ID','TEXT'],['nip','NIP','TEXT'],['nama','Nama','TEXT'],['status','Status','TEXT'],['created_at','Dibuat','DATETIME'],['updated_at','Diubah','DATETIME']],
MASTER_KARYAWAN:[['id','ID','TEXT'],['nik','NIK','TEXT'],['nama','Nama','TEXT'],['status','Status','TEXT'],['created_at','Dibuat','DATETIME'],['updated_at','Diubah','DATETIME']],
MASTER_SISWA:[['id','ID','TEXT'],['nisn','NISN','TEXT'],['nama','Nama','TEXT'],['kelas_id','Kelas ID','TEXT'],['status','Status','TEXT'],['created_at','Dibuat','DATETIME'],['updated_at','Diubah','TEXT']],
MASTER_KELAS:[['id','ID','TEXT'],['kelas','Kelas','TEXT'],['spreadsheet_id','ID Spreadsheet Kelas','TEXT'],['status','Status','TEXT'],['created_at','Dibuat','DATETIME'],['updated_at','Diubah','DATETIME']],
MASTER_MAPEL:[['id','ID','TEXT'],['kode','Kode','TEXT'],['nama','Nama Mapel','TEXT'],['status','Status','TEXT'],['created_at','Dibuat','DATETIME'],['updated_at','Diubah','DATETIME']],
MASTER_MENU:[['id','ID','TEXT'],['key','Key','TEXT'],['label','Label','TEXT'],['icon','Icon','TEXT'],['handler','Handler','TEXT'],['urutan','Urutan','NUMBER'],['roles','Roles','TEXT'],['active','Aktif','BOOLEAN'],['config_json','Config JSON','TEXT'],['created_at','Dibuat','TEXT'],['updated_at','Diubah','DATETIME']],
MASTER_COLUMNS:[['id','ID','TEXT'],['target','Target Sheet','TEXT'],['column_id','Column ID','TEXT'],['label','Label','TEXT'],['type','Type','TEXT'],['required','Required','BOOLEAN'],['position','Position','NUMBER'],['active','Aktif','BOOLEAN'],['created_at','Dibuat','DATETIME'],['updated_at','Diubah','DATETIME']],
MASTER_AUDIT:[['id','ID','TEXT'],['actor_user_id','Actor User ID','TEXT'],['action','Action','TEXT'],['target','Target','TEXT'],['target_id','Target ID','TEXT'],['payload_json','Payload','TEXT'],['created_at','Dibuat','DATETIME']]
});
function getOrCreateMasterSpreadsheet_(){const props=PropertiesService.getScriptProperties();let id=props.getProperty('MASTER_SPREADSHEET_ID');if(id)return SpreadsheetApp.openById(id);const ss=SpreadsheetApp.create(APP.name+' MASTER');props.setProperty('MASTER_SPREADSHEET_ID',ss.getId());props.setProperty('MASTER_OWNER_EMAIL',Session.getEffectiveUser().getEmail());return ss;}
function getMasterSpreadsheet_(){return getOrCreateMasterSpreadsheet_();}
