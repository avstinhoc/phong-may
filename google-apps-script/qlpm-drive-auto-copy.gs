/**
 * QLPM — Google Drive auto-copy bridge.
 *
 * Deploy as a Google Apps Script Web App from the OWNER of the QLPM Drive folder:
 * Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone.
 *
 * Run setupQlpmCopy() once; it prints a signing key in the execution log.
 * Store the key only in Supabase Edge Secrets as QLPM_APPS_SCRIPT_SIGNING_KEY.
 * Store the /exec URL in QLPM_APPS_SCRIPT_WEB_APP_URL.
 *
 * A signed, expiring request from the authenticated Supabase Edge Function is
 * required. Google Drive access is authorized once by the folder owner here;
 * the QLPM website never receives any Google OAuth token or signing secret.
 */
const ROOT_FOLDER_ID = '1d8ZiM9q2xyxKNZwTSD5mN77fpVma-Nti';
const TEMPLATE_SHEET_ID = '1zxht2Ft4mr6DEkycI--wXqZJbXLRJ-8iHtVc64horpM';
const TEMPLATE_NAME = 'DS ĐIỂM DANH';

function setupQlpmCopy() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('QLPM_COPY_SIGNING_KEY')) {
    const bytes = [];
    for (let i = 0; i < 4; i++) bytes.push(Utilities.getUuid().replace(/-/g, ''));
    props.setProperty('QLPM_COPY_SIGNING_KEY', bytes.join(''));
  }
  Logger.log('QLPM_APPS_SCRIPT_SIGNING_KEY = ' + props.getProperty('QLPM_COPY_SIGNING_KEY'));
  Logger.log('QLPM root: ' + ROOT_FOLDER_ID + '; template: ' + TEMPLATE_SHEET_ID);
  // Running this helper also triggers the owner's Google Drive authorization.
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const template = DriveApp.getFileById(TEMPLATE_SHEET_ID);
  if (template.getName() !== TEMPLATE_NAME) throw new Error('File mẫu không đúng tên DS ĐIỂM DANH.');
  if (template.getMimeType() !== MimeType.GOOGLE_SHEETS) throw new Error('File mẫu phải là Google Sheets.');
  if (!isChildOf_(template, ROOT_FOLDER_ID)) throw new Error('Di chuyển file DS ĐIỂM DANH vào thư mục QLPM.');
  Logger.log('Đã kiểm tra quyền: ' + root.getName() + ' / ' + template.getName());
}

function isChildOf_(file, folderId) {
  const parents = file.getParents();
  while (parents.hasNext()) if (parents.next().getId() === folderId) return true;
  return false;
}
function answer_(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(ContentService.MimeType.JSON);
}
function safeEqual_(a, b) {
  a = String(a || ''); b = String(b || '');
  let value = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    value |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return value === 0;
}
function sign_(message, secret) {
  const bytes = Utilities.computeHmacSha256Signature(message, secret);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}
function doGet() { return answer_({ok:false, error:'Chỉ chấp nhận POST có chữ ký từ QLPM.'}); }

function doPost(e) {
  let lock = null;
  try {
    const body = JSON.parse(e?.postData?.contents || '{}');
    const secret = PropertiesService.getScriptProperties().getProperty('QLPM_COPY_SIGNING_KEY');
    if (!secret || secret.length < 60) throw new Error('Apps Script chưa chạy setupQlpmCopy.');
    if (body.action !== 'copy_school_template') throw new Error('Action không hợp lệ.');
    if (!/^[a-f0-9-]{36}$/i.test(String(body.school_id || ''))) throw new Error('Mã trường không hợp lệ.');
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(String(body.nonce || ''))) throw new Error('Nonce không hợp lệ.');
    const ts = Number(body.ts);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000)
      throw new Error('Yêu cầu đã hết hạn.');
    const filename = String(body.filename || '');
    if (!filename.startsWith('DS ĐIỂM DANH ') || filename.length > 115 ||
        /[\\/\u0000-\u001f]/.test(filename)) throw new Error('Tên bảng tính không hợp lệ.');
    if (body.root_id !== ROOT_FOLDER_ID || body.template_id !== TEMPLATE_SHEET_ID)
      throw new Error('Cấu hình thư mục/file mẫu không khớp.');
    const data = [String(body.ts), body.nonce, body.school_id, filename,
      ROOT_FOLDER_ID, TEMPLATE_SHEET_ID].join('|');
    if (!safeEqual_(body.signature, sign_(data, secret)))
      throw new Error('Chữ ký xác thực không hợp lệ.');

    lock = LockService.getScriptLock();
    if (!lock.tryLock(25000)) throw new Error('Hệ thống đang tạo file khác, vui lòng thử lại.');
    const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const template = DriveApp.getFileById(TEMPLATE_SHEET_ID);
    if (template.getName() !== TEMPLATE_NAME || template.getMimeType() !== MimeType.GOOGLE_SHEETS ||
        !isChildOf_(template, ROOT_FOLDER_ID))
      throw new Error('File mẫu DS ĐIỂM DANH không nằm đúng thư mục QLPM.');

    const found = root.getFilesByName(filename);
    const matches = [];
    while (found.hasNext()) {
      const file = found.next();
      if (!file.isTrashed() && file.getMimeType() === MimeType.GOOGLE_SHEETS) matches.push(file);
    }
    if (matches.length > 1) throw new Error('Có nhiều file trùng tên. Hãy xử lý file trùng trong QLPM.');
    if (matches.length === 1) {
      const marker = String(matches[0].getDescription() || '');
      if (marker.startsWith('QLPM_SCHOOL_ID:') && marker !== 'QLPM_SCHOOL_ID:' + body.school_id)
        throw new Error('File trùng tên đã được gắn cho trường khác.');
      return answer_({ok:true, reused:true, spreadsheet_id:matches[0].getId(), title:filename});
    }
    const file = template.makeCopy(filename, root);
    file.setDescription('QLPM_SCHOOL_ID:' + body.school_id);
    return answer_({ok:true, reused:false, spreadsheet_id:file.getId(), title:filename});
  } catch (error) {
    // Do not echo tokens or request bodies in logs or responses.
    return answer_({ok:false,error:String(error?.message||'Không tạo được file Google Sheets.').slice(0,250)});
  } finally {
    if (lock) try { lock.releaseLock(); } catch (e) {}
  }
}
