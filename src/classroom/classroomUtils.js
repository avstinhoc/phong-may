// Shared classroom presentation helpers. No remote image sources.
// Images are explicitly chosen by the sender, resized locally and stored
// in private server-controlled conversation records (never a public URL).
export const classroomDate=value=>value?new Date(value).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
export const classroomRelative=value=>{
 if(!value)return 'Không giới hạn';
 const date=new Date(value),now=Date.now();
 return date.getTime()<now?'Đã hết hạn':'Hạn nộp: '+classroomDate(value);
};
export async function compressClassroomImage(file){
 if(!file) return null;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Chỉ nhận ảnh JPG, PNG hoặc WebP');
 if(file.size>6*1024*1024)throw Error('Ảnh gốc vượt 6 MB. Hãy chọn ảnh khác.');
 const input=URL.createObjectURL(file);
 try{
  const image=new Image();
  image.decoding='async';image.src=input;
  await image.decode();
  const ratio=Math.min(1,720/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.72,.56,.42,.30]){
   const data=canvas.toDataURL('image/jpeg',quality);
   if(data.length<=175000)return data;
  }
  throw Error('Ảnh còn quá lớn sau khi nén. Hãy chọn ảnh có độ phân giải thấp hơn.');
 }finally{URL.revokeObjectURL(input)}
}
export const classroomBlankQuiz=()=>({prompt:'',choices:['','','',''],correct:0});

/** Search student names with or without Vietnamese accents (including đ/Đ). */
export const classroomNameKey=value=>String(value??'').normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D')
 .toLocaleLowerCase('vi').trim().replace(/\s+/g,' ');
export const filterClassroomStudents=(students,query)=>{
 const term=classroomNameKey(query);
 return term?students.filter(student=>classroomNameKey(student.name).includes(term)):students;
};
