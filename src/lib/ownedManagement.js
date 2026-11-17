// Management navigation uses the currently authenticated user's memberships, even
// for admins; admin account-moderation endpoints remain separate.
export function restrictManagementScope({schools=[],workplaces=[],links=[],membershipIds=[],accountId='',profileSchoolId=''}={}){
 const membership=new Set((membershipIds||[]).filter(Boolean));
 if(profileSchoolId)membership.add(profileSchoolId);
 const units=(workplaces||[]).filter(w=>w.created_by===accountId);
 const unitIds=new Set(units.map(w=>w.id));
 const ownSchools=(schools||[]).filter(s=>membership.has(s.id));
 const ownSchoolIds=new Set(ownSchools.map(s=>s.id));
 const ownLinks=(links||[]).filter(l=>unitIds.has(l.workplace_id)&&ownSchoolIds.has(l.school_id));
 return {schools:ownSchools,workplaces:units,links:ownLinks};
}
