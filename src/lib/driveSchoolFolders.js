// Google Drive folder URL parser. The folder must be a real Drive folder;
// the server checks its ID, type and Service Account editor capabilities.
export function parseDriveFolderUrl(value){
 const text=String(value||'').trim();
 const match=/^https:\/\/drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders\/|drive\/folders\/)([A-Za-z0-9_-]{20,160})(?:[/?#]|$)/.exec(text);
 if(!match)throw new Error('Dán link thư mục dạng https://drive.google.com/drive/folders/...');
 return match[1];
}
export function schoolFolderSuggestedName(name){
 return String(name||'Trường').trim().slice(0,140);
}
