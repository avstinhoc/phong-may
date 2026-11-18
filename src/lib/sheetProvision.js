// Service Accounts cannot own newly copied files in teachers' personal My Drive.
// New schools show a guided Google /copy flow in Danh sách học sinh, not a doomed API call.
export async function provisionSchoolWorkbook(supabase,schoolId){
 if(!schoolId)return {ok:false,message:'Chưa chọn trường học.'};
 const {data,error}=await supabase.from('school_sheet_links')
  .select('spreadsheet_id').eq('school_id',schoolId).maybeSingle();
 if(error)return {ok:false,message:error.message};
 if(data?.spreadsheet_id)return {ok:true,alreadyLinked:true,spreadsheetId:data.spreadsheet_id};
 return {ok:false,manual:true,message:'Vào Danh sách học sinh → Liên kết Google Sheets → Tạo file Google Sheets của trường. Sau khi xác nhận bản sao trên Google, cấp quyền Editor cho Service Account và dán liên kết.'};
}
