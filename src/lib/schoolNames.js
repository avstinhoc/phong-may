// Shared formatting for all school name entry points. Keep Vietnamese accents.
export function uppercaseSchoolName(value,trim=true){
 const normalized=String(value??'').normalize('NFC').toLocaleUpperCase('vi-VN')
   .replace(/\s+/g,' ');
 return trim?normalized.trim():normalized;
}
