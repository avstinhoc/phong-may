// A school can be created before it needs Sheets. No Google OAuth is required.
// If a school already has a workbook, coworkers automatically reuse that school link.
// When needed, the teacher clicks the one-click creation flow in Danh sách học sinh.
// The authenticated Edge Function uses an owner-executed Apps Script configured once
// by Admin, because a Service Account cannot own new files in a personal My Drive.
export async function provisionSchoolWorkbook(supabase,schoolId){
 if(!schoolId)return {ok:false,message:'Chưa chọn trường học.'};
 const {data,error}=await supabase.from('school_sheet_links')
  .select('spreadsheet_id').eq('school_id',schoolId).maybeSingle();
 if(error)return {ok:false,message:error.message};
 if(data?.spreadsheet_id)return {ok:true,alreadyLinked:true,spreadsheetId:data.spreadsheet_id};
 return {ok:false,manual:true,message:'Vào Danh sách học sinh → Liên kết Google Sheets → Tạo file Google Sheets của trường. QLPM tự lấy mẫu DS ĐIỂM DANH, lưu trong thư mục QLPM và gắn liên kết (sau khi Admin đã thiết lập Apps Script một lần).'};
}
