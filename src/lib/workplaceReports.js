// Display identical school names once without merging or deleting their independent records.
export const schoolNameKey=name=>String(name||'').normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d')
 .toLocaleLowerCase('vi').replace(/[^a-z0-9]+/g,' ').trim();

export function groupSchoolNames(schools=[]){
 const groups=new Map();
 for(const school of schools){
  if(!school?.id)continue;
  const key=schoolNameKey(school.name)||school.id;
  if(!groups.has(key))groups.set(key,{key,name:String(school.name||'').trim(),ids:[],schools:[]});
  const group=groups.get(key);
  if(group.ids.includes(school.id))continue;
  group.ids.push(school.id);
  group.schools.push(school);
 }
 return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));
}

export function schoolsForWorkplace(workplaceId,schools=[],links=[]){
 const ids=new Set(links.filter(l=>l.workplace_id===workplaceId).map(l=>l.school_id));
 return schools.filter(s=>ids.has(s.id));
}

// Payroll reports for a unit include only school IDs linked to that unit.
// Teacher, dates and row visibility are still restricted by the caller's RLS data.
export function sessionsForWorkplace({workplaceId,links=[],sessions=[],teacherId,from,to,schoolById={}}){
 const ids=new Set(links.filter(l=>l.workplace_id===workplaceId).map(l=>l.school_id));
 return (sessions||[])
  .filter(s=>ids.has(s.school_id)&&s.teacher_id===teacherId&&s.session_date>=from&&s.session_date<=to)
  .map(s=>({...s,school_name:schoolById[s.school_id]||''}));
}
