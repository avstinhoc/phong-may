/**
 * PHƯN QLPM — đóng dấu NGÀY HỌC CỐ ĐỊNH khi nhập số tiết màu cam.
 *
 * Cài 1 lần trong Google Sheets: Tiện ích mở rộng → Apps Script → dán,
 * chọn Lưu. Không cần thêm trigger: onEdit(e) là simple trigger.
 *
 * - J6:CA6 = số tiết, J7:CA7 = ngày dạy cố định.
 * - Chỉ ghi ngày khi B mới có số tiết và ô ngày chưa có giá trị cố định.
 * - Không sửa ngày của các buổi trước khi chỉ điều chỉnh số tiết.
 * - Không tự xóa lịch sử ngày sau khi xóa số tiết (muốn sửa, thao tác ô ngày).
 * - Không đụng tên, điểm, checkbox hay công thức tính chuyên cần.
 */
function onEdit(e) {
  if (!e || !e.range) return;
  var range = e.range, sheet = range.getSheet();
  if (!/^\d{1,2}\.\d{1,2}$/.test(sheet.getName())) return;
  var r = range.getRow(), col = range.getColumn();
  if (r !== 6 || col < 10 || col > 79) return;
  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;
  var value = sheet.getRange(6,col).getValue();
  if (typeof value !== 'number' || value <= 0 || !isFinite(value)) return;
  // Editing an existing lesson count must not reset its original date.
  if (e.oldValue !== undefined && String(e.oldValue).trim() !== '') return;
  var cell = sheet.getRange(7,col);
  // A fixed (non-formula) date always wins, including manual corrections.
  if (!cell.getFormula() && cell.getValue() !== '') return;
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';
  var today = Utilities.formatDate(new Date(),tz,'yyyy-MM-dd');
  // Noon in Viet Nam avoids accidental date shifts if the script timezone differs.
  var day = new Date(today + 'T12:00:00+07:00');
  cell.setValue(day);
  cell.setNumberFormat('dd/MM');
  cell.setNote('Ngày học được ghi cố định bởi Phưn QLPM khi nhập số tiết. Có thể sửa ngày tại ô này.');
}
/**
 * Chạy thủ công một lần SAU KHI đã xem lại J7:CA7.
 * - Ô chưa có tiết: xóa công thức TODAY để không dùng lại.
 * - Ô đã có tiết nhưng công thức TODAY: giữ nguyên và gắn cảnh báo;
 *   lịch cũ cần giáo viên nhập đúng ngày (không tự đoán lịch sử).
 * - Ô đã có ngày cố định: giữ nguyên.
 */
function kiemTraNgayCu() {
  var ss=SpreadsheetApp.getActiveSpreadsheet(),count=0;
  ss.getSheets().forEach(function(sheet){
    if (!/^\d{1,2}\.\d{1,2}$/.test(sheet.getName())) return;
    var period=sheet.getRange('J6:CA6').getValues()[0];
    var dates=sheet.getRange('J7:CA7');
    var formulas=dates.getFormulas()[0];
    for(var i=0;i<70;i++){
      if(!formulas[i])continue;
      var cell=sheet.getRange(7,i+10);
      if(period[i] === '' || period[i]===null){
        cell.clearContent();
      }else{
        cell.setNote('CẦN XÁC MINH NGÀY CŨ: ô này đang dùng TODAY(), không lưu được ngày gốc. Hãy điền ngày đã học tại ô này, ví dụ 05/10/2026.');
        count++;
      }
    }
  });
  SpreadsheetApp.getUi().alert('Đã bỏ công thức ngày động ở các buổi trống. '+count+' ô đã có tiết cần xác minh ngày lịch sử và nhập ngày cố định thủ công.');
}
