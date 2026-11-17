export function ownTeachingLessons(rows=[],teacherId=''){
 return (rows||[]).filter(s=>s.teacher_id===teacherId||(!s.teacher_id&&s.created_by===teacherId));
}
export function teachingLessonLabel(lesson={}){
 const date=String(lesson.session_date||'').split('-').reverse().join('/');
 const start=String(lesson.start_time||'').slice(0,5);
 const end=String(lesson.end_time||'').slice(0,5);
 return 'Lớp '+String(lesson.class_name||'')+' · '+date+' · '+start+'–'+end;
}
