export const properName = name => String(name||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi-VN').replace(/(^|[\s-])(\p{L})/gu,(_,space,letter)=>space+letter.toLocaleUpperCase('vi-VN'));
export const searchName = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
export const comparePC = (a,b) => a.localeCompare(b,'vi',{numeric:true,sensitivity:'base'});

/** Vietnamese classroom lists are ordered by the LAST name token, then preceding names. */
export const compareStudentName=(a,b)=>{
 const tokens=value=>properName(value).split(/\s+/).filter(Boolean);
 const aa=tokens(typeof a==='string'?a:a?.full_name),bb=tokens(typeof b==='string'?b:b?.full_name);
 const first=(aa.at(-1)||'').localeCompare(bb.at(-1)||'','vi',{sensitivity:'base'});
 if(first)return first;
 const rest=aa.slice(0,-1).join(' ').localeCompare(bb.slice(0,-1).join(' '),'vi',{sensitivity:'base'});
 if(rest)return rest;
 return String(typeof a==='string'?a:a?.id||'').localeCompare(String(typeof b==='string'?b:b?.id||''));
};
