// Keep class filters strictly limited to registration codes of classes the current
// teacher owns. No client-side filtering authorizes any server-side action.
export function pendingRegistrationsForClass(registrations=[],ownedClasses=[],selectedClassId=''){
 const classes=(ownedClasses||[]).filter(c=>c?.id&&c?.registration_code&&!c.archived_at);
 const codes=new Set(classes.filter(c=>!selectedClassId||c.id===selectedClassId).map(c=>c.registration_code));
 return (registrations||[]).filter(r=>r?.status==='pending'&&codes.has(r.registration_code));
}

export function nextFriendRegistration(previous={}){
 return {
  code:String(previous.code||'').trim().toUpperCase(),
  name:'',gender:'',computer:'',note:''
 };
}

export function canConfirmFlaggedName(student){
 return Boolean(student?.status==='active'&&student?.name_review_status==='review');
}
