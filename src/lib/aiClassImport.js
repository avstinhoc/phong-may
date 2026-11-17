// Pure extraction guards: the language model never controls class IDs or table names.
export const SCORE_KEYS=['QT1','QT2','HK1','QT3','QT4','HK2',
  'TEST 1','TEST 2','TEST 3','TEST 4','TEST 5',
  'Mô phỏng lần 1','Mô phỏng lần 2','Mô phỏng lần 3','Mô phỏng lần 4','Mô phỏng lần 5'];
const noAccent=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[Đđ]/g,'d').trim().toLocaleLowerCase('vi');
export const studentNameKey=s=>noAccent(s).replace(/\s+/g,' ');
const trim=s=>typeof s==='string'?s.trim():'';
export function normalizeScoreKey(value){
 const k=studentNameKey(value).toUpperCase().replace(/\s+/g,' ');
 if(/^(QT|HK)[1-4]$/.test(k))return SCORE_KEYS.includes(k)?k:null;
 const test=k.match(/^TEST\s*([1-5])$/);
 if(test)return 'TEST '+test[1];
 const mock=k.match(/^MO\s*PHONG\s*LAN\s*([1-5])$/);
 if(mock)return 'Mô phỏng lần '+mock[1];
 return null;
}
export function validateExtractedRows(kind,items,{limit=120}={}){
 if(!['students','grades'].includes(kind))throw Error('Loại dữ liệu không hỗ trợ');
 if(!Array.isArray(items)||!items.length)throw Error('AI chưa nhận diện được dòng dữ liệu để nhập.');
 if(items.length>limit)throw Error('Tệp có quá nhiều học sinh; hãy chia thành từng lớp/tệp nhỏ.');
 const warnings=[],rows=[],seen=new Set();
 items.forEach((item,i)=>{
  const full_name=trim(item?.full_name).replace(/\s+/g,' ').slice(0,100);
  if(!full_name||full_name.length<3){warnings.push('Dòng '+(i+1)+': chưa đọc rõ họ tên');return;}
  const norm=studentNameKey(full_name);
  if(seen.has(norm)){warnings.push('Dòng '+(i+1)+': tên '+full_name+' bị lặp trong ảnh/tệp');return;}
  seen.add(norm);
  if(kind==='students'){
   const g=studentNameKey(item.gender);
   const gender=g==='nam'?'Nam':g==='nu'?'Nữ':g==='khac'?'Khác':'';
   const student_code=trim(item.student_code).slice(0,40);
   if(g&&!gender)warnings.push('Dòng '+(i+1)+': giới tính của '+full_name+' chưa rõ');
   rows.push({full_name,gender,student_code});
  }else{
   const scores={};
   for(const [key,value] of Object.entries(item.scores||{})){
    const normalized=normalizeScoreKey(key);
    if(!normalized){warnings.push('Dòng '+(i+1)+': cột '+key+' không được nhận diện');continue;}
    const raw=typeof value==='number'?String(value):String(value??'').trim();
    const num=raw?Number(raw.replace(',','.')):NaN;
    if(!Number.isFinite(num)||num<0||num>10||Math.abs(Math.round(num*100)-num*100)>1e-7){
      warnings.push('Dòng '+(i+1)+': điểm '+normalized+' không hợp lệ (0–10)');continue;
    }
    scores[normalized]=num;
   }
   if(!Object.keys(scores).length){warnings.push('Dòng '+(i+1)+': '+full_name+' chưa có điểm hợp lệ');return;}
   rows.push({full_name,scores});
  }
 });
 return {rows,warnings};
}
