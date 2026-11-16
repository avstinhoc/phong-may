export function normalizeComputerCode(value){
 const raw=String(value||'').trim().toUpperCase().replace(/\s+/g,'');
 if(!raw)return '';
 const m=raw.match(/^(?:PC)?0*([0-9]{1,3})$/);
 if(!m)return null;
 const n=Number(m[1]);
 return n>=1&&n<=500?'PC'+n:null;
}
export function shortCodePreview(schoolName,className){
 const ascii=s=>String(s||'').replace(/[đĐ]/g,'d').normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').toUpperCase();
 const school=ascii(schoolName).replace(/^(TRUONG\s+)?(THCS|THPT|TRUNG HOC CO SO|TIEU HOC)\s+/,'')
   .replace(/[^A-Z0-9]/g,'').slice(0,18);
 const label=ascii(className).replace(/[^A-Z0-9.]/g,'').slice(0,24);
 return school&&label?'IC3-'+school+'-'+label:'';
}
export function validFullName(value){
 const s=String(value||'').trim().replace(/\s+/g,' ');
 return s.length>=5&&s.length<=90&&s.split(' ').length>=2&&/^[\p{L} ]+$/u.test(s);
}
