// Cancellation is a non-destructive flag on a planned lesson.
// Existing attendance stays attached for audit, but a cancelled lesson
// must never be counted as taught, paid, or present by default.
export const taughtLessons=rows=>(rows||[]).filter(row=>row?.is_cancelled!==true);

export const lessonsForHoliday=(rows,day,shift='all')=>
 (rows||[]).filter(row=>row.session_date===day&&row.is_cancelled!==true
   &&(shift==='all'||(String(row.start_time||'').slice(0,5)<'12:00'?'morning':'afternoon')===shift));

export const holidayShiftLabel=shift=>shift==='morning'?'buổi sáng':shift==='afternoon'?'buổi chiều':'cả ngày';
