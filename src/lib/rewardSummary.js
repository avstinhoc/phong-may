import {compareStudentName,searchName} from './students.js';

const amount = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const sameClass = (student,klass) => !klass || student.class_name===klass;
const matches = (student,term) => !term || searchName(student.full_name).includes(searchName(term.trim()));

/** School-scoped rows only: never join by student names or class labels. */
export function rewardSummaryRows(students=[],wallets=[],records=[],klass='',term=''){
 const walletsById=new Map(wallets.map(w=>[w.student_id,w]));
 const pointsById=new Map();
 const rewardEventsById=new Map();
 for(const record of records){
  if(!record?.student_id)continue;
  if(record.record_type==='point'){
   pointsById.set(record.student_id,(pointsById.get(record.student_id)||0)+amount(record.points));
  }
  if(record.record_type==='reward'&&amount(record.points)>0){
   rewardEventsById.set(record.student_id,(rewardEventsById.get(record.student_id)||0)+1);
  }
 }
 return students
  .filter(s=>s.status==='active'&&sameClass(s,klass)&&matches(s,term))
  .map(s=>{
   const wallet=walletsById.get(s.id);
   return {...s,available:amount(wallet?.available),earned:amount(wallet?.earned),
    learningPoints:pointsById.get(s.id)||0,awardEvents:rewardEventsById.get(s.id)||0,
    canRestore:wallet?.can_restore||false};
  })
  .sort(compareStudentName);
}

/** Recent source events, not synthetic leaderboard positions or duplicate awards. */
export function recentRewardActivity(students=[],records=[],klass='',term='',limit=80){
 const studentsById=new Map(students.filter(s=>s.status==='active').map(s=>[s.id,s]));
 return records.filter(r=>{
  const student=studentsById.get(r.student_id);
  return student&&sameClass(student,klass)&&matches(student,term)&&
   (r.record_type==='point'||r.record_type==='reward'&&r.star_event!=='recovery');
 }).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))||
    String(b.id||'').localeCompare(String(a.id||''))).slice(0,limit)
 .map(r=>({...r,student:studentsById.get(r.student_id)}));
}
