// A school record must never be rolled back because Google Drive creation fails.
// Service accounts require access to a Shared Drive folder to own new workbooks;
// personal My Drive users can still paste a manually copied workbook link.
export async function provisionSchoolWorkbook(supabase,schoolId){
 const {data,error}=await supabase.functions.invoke('google-sheets-sync',{
  body:{action:'provision_school',school_id:schoolId}
 });
 if(error){
  let msg=error.message||'Không thể sao chép file Sheets';
  try{const response=await error.context?.json?.();msg=response?.error||msg;}catch{}
  return {ok:false,message:msg};
 }
 if(data?.error)return {ok:false,message:data.error};
 if(!data?.success)return {ok:false,message:'Google chưa xác nhận việc tạo Sheets.'};
 return {ok:true,spreadsheetId:data.spreadsheetId,alreadyLinked:!!data.alreadyLinked};
}
