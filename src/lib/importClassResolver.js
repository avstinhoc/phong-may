// Match a file's class to an existing teacher-owned class, never inventing IDs.
const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[đĐ]/g,'d').toLocaleLowerCase('vi').trim();
const classKey=value=>fold(value).replace(/^lop\s*[:.\-]?\s*/,'')
  .replace(/\s+/g,'').replace(/[\/_-]/g,'.');
const isWordChar=value=>/[a-z0-9]/.test(value||'');

function appearsIn(source,className){
 const text=fold(source),needle=fold(className).replace(/^lop\s+/,'').trim();
 if(!needle)return false;
 let position=text.indexOf(needle);
 while(position!==-1){
  if(!isWordChar(text[position-1])&&!isWordChar(text[position+needle.length]))return true;
  position=text.indexOf(needle,position+1);
 }
 return false;
}

export function resolveImportClass(classes,{detectedClass='',fileName='',question='',classId=''}={}){
 const owned=(Array.isArray(classes)?classes:[]).filter(c=>c?.id&&c?.class_name);
 const detected=String(detectedClass||'').trim();
 const matchingDetected=detected?owned.filter(c=>classKey(c.class_name)===classKey(detected)):[];
 if(detected&&matchingDetected.length!==1)return {classroom:null,
  error:'AI nhận diện lớp "'+detected+'" nhưng không tìm thấy đúng một lớp bạn quản lý tại trường này. Hãy kiểm tra hoặc tạo lớp trong Lớp & mã đăng ký.'};
 const filenames=owned.filter(c=>appearsIn(fileName,c.class_name));
 const mentioned=owned.filter(c=>appearsIn(question,c.class_name));
 const selected=classId?owned.filter(c=>c.id===classId):[];
 if(classId&&selected.length!==1)return {classroom:null,error:'Lớp đã chọn không thuộc quyền quản lý của bạn.'};
 const evidence=[...matchingDetected,...filenames,...mentioned,...selected];
 const unique=[...new Map(evidence.map(c=>[c.id,c])).values()];
 if(unique.length>1)return {classroom:null,error:'Tên lớp trong nội dung, tên file hoặc lời nhắn chưa thống nhất. Hãy gửi lại yêu cầu nêu rõ một lớp và kiểm tra tên file.'};
 if(!unique.length)return {classroom:null,error:owned.length?
  'Chưa xác định được lớp từ nội dung hoặc tên file. Hãy nhắn rõ tên lớp (ví dụ: nhập danh sách học sinh lớp 6.1) và đảm bảo lớp đã có trong Lớp & mã đăng ký.':
  'Trường này chưa có lớp do bạn quản lý. Hãy tạo lớp trong Lớp & mã đăng ký trước khi nhập.'};
 return {classroom:unique[0],warning:!detected?
  'Tên lớp chưa được AI xác nhận trực tiếp từ nội dung. Đã đối chiếu lớp '+unique[0].class_name+' từ tên file hoặc yêu cầu; hãy kiểm tra trước khi lưu.':null};
}
