export const properName = name => String(name||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi-VN').replace(/(^|[\s-])(\p{L})/gu,(_,space,letter)=>space+letter.toLocaleUpperCase('vi-VN'));
export const searchName = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
export const comparePC = (a,b) => a.localeCompare(b,'vi',{numeric:true,sensitivity:'base'});
