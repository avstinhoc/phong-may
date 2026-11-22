import React,{useEffect,useState} from 'react';
import {FileText,Paperclip,ExternalLink,Download,Image as PictureIcon,AlertCircle} from 'lucide-react';
import {supabase} from '../lib/supabase.js';

const extensions=new Set(['jpg','jpeg','png','webp','gif','pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv']);
export const CLASSROOM_FILE_ACCEPT='.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';
export function checkClassroomAttachment(file){
 if(!file)throw Error('Chưa chọn tệp đính kèm');
 const extension=String(file.name||'').split('.').at(-1)?.toLowerCase()||'';
 if(!extensions.has(extension))
  throw Error('Chỉ nhận ảnh JPG/PNG/WebP/GIF, PDF, Word, Excel, PowerPoint, TXT hoặc CSV.');
 if(file.size<=0||file.size>8*1024*1024)
  throw Error('Mỗi file tối đa 8 MB. Hãy chọn file nhỏ hơn.');
 return file;
}
export function clipboardClassroomFile(event){
 const files=Array.from(event.clipboardData?.files||[]);
 const file=files.find(f=>f.type.startsWith('image/')) || 
  Array.from(event.clipboardData?.items||[]).find(i=>i.kind==='file'&&i.type.startsWith('image/'))?.getAsFile();
 if(!file)return null;
 event.preventDefault();
 const ext=file.type==='image/jpeg'?'jpg':file.type==='image/webp'?'webp':'png';
 return new File([file],file.name&&/\.(png|jpg|jpeg|webp|gif)$/i.test(file.name)?file.name:'anh-dan.'+ext,
  {type:file.type||'image/png',lastModified:Date.now()});
}
export async function classroomUpload({file,body='',studentId=null,studentToken=null}){
 checkClassroomAttachment(file);
 const form=new FormData();
 form.append('action','upload');
 form.append('file',file,file.name);
 form.append('body',body);
 if(studentId)form.append('student_id',studentId);
 const {data,error}=await supabase.functions.invoke('classroom-attachments',{
  body:form,headers:studentToken?{'x-student-session':studentToken}:{}
 });
 if(error)throw Error((await error.context?.json?.().catch(()=>null))?.error||error.message||'Không gửi được file');
 if(!data?.ok)throw Error(data?.error||'Không gửi được file');
 return data;
}
export async function classroomSignedFile(id,studentToken=null){
 const {data,error}=await supabase.functions.invoke('classroom-attachments',{
  body:{action:'sign',message_id:id},headers:studentToken?{'x-student-session':studentToken}:{}
 });
 if(error)throw Error((await error.context?.json?.().catch(()=>null))?.error||error.message||'Không mở được file');
 if(!data?.url)throw Error(data?.error||'Không tìm thấy liên kết file');
 return data;
}

export function ClassroomAttachment({message,studentToken=null}){
 const [signed,setSigned]=useState(null),[error,setError]=useState('');
 const isImage=/^image\/(jpeg|png|webp|gif)$/.test(message.file_type||'');
 useEffect(()=>{
  let alive=true;
  if(!message.file_name)return;
  classroomSignedFile(message.id,studentToken).then(data=>{if(alive)setSigned(data)})
   .catch(e=>{if(alive)setError(e.message)});
  return()=>{alive=false};
 },[message.id,studentToken,message.file_name]);
 async function view(){
  try{
   // Signed links are short-lived. Re-sign on every deliberate click.
   const signedNow=await classroomSignedFile(message.id,studentToken);
   window.open(signedNow.url,'_blank','noopener,noreferrer');
  }catch(e){setError(e.message)}
 }
 if(!message.file_name)return null;
 return <div className="classroom-file-message">
  {isImage&&signed?.url&&<button className="classroom-file-picture" type="button" onClick={view}
   title="Xem ảnh riêng tư ở kích thước đầy đủ">
   <img src={signed.url} loading="lazy" alt={'Ảnh '+message.file_name}/>
  </button>}
  <button className="classroom-file-download" type="button" onClick={view}>
   {isImage?<PictureIcon size={17}/>:<FileText size={20}/>}
   <span><strong>{message.file_name}</strong>
    <small>{message.file_size?Math.ceil(message.file_size/1024)+' KB':'Tệp đính kèm'} · Chỉ người trong cuộc trò chuyện xem được</small></span>
   <ExternalLink size={17}/>
  </button>
  {error&&<small role="alert" className="classroom-file-error"><AlertCircle size={13}/>{error}</small>}
 </div>;
}
export function ClassroomDraftAttachment({file,onRemove}){
 if(!file)return null;
 return <div className="classroom-draft-attachment">
  <Paperclip size={16}/><span>{file.name}<small>{Math.ceil(file.size/1024)} KB</small></span>
  <button type="button" onClick={onRemove} aria-label="Bỏ file đính kèm">×</button>
 </div>;
}
