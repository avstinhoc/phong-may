import React,{useState} from 'react';
import {supabase} from './lib/supabase';
import {StudentPicker} from './StudentPicker';
import './RecordCorrectionEditor.css';

const dateValue=value=>String(value||'').slice(0,10);
const initial=record=>({
 student_id:record.student_id,
 record_type:record.record_type,
 title:record.title||'',
 points:String(record.points??0),
 record_date:dateValue(record.record_date),
 note:record.note||'',
 reason:''
});

/** Only the audited RPC can mutate records; do not update the ledger from the client. */
export function RecordCorrectionEditor({record,students,onSaved,onCancel}){
 const [form,setForm]=useState(()=>initial(record));
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const penalty=record.star_event==='penalty';
 const recovery=record.star_event==='recovery';
 const redeem=record.record_type==='reward'&&Number(record.points)<0&&!penalty;
 const lockedType=penalty||redeem||recovery;
 const oldStudent=students.find(s=>s.id===record.student_id);
 const newStudent=students.find(s=>s.id===form.student_id);
 const amount=Number(form.points);
 async function submit(e){
   e.preventDefault();setError('');
   if(busy)return;
   if(recovery){setError('Lượt khôi phục cần được đối soát riêng; không thể sửa trực tiếp.');return;}
   if(!newStudent){setError('Hãy chọn đúng học sinh từ danh sách gợi ý.');return;}
   if(form.reason.trim().length<5){setError('Nhập lý do sửa ít nhất 5 ký tự.');return;}
   if(!form.title.trim()){setError('Nội dung ghi nhận không được để trống.');return;}
   if(!Number.isFinite(amount)||Math.abs(amount)>99999){setError('Số sao/điểm không hợp lệ.');return;}
   if(form.record_type==='violation'&&amount!==0){setError('Lỗi chính thức có số điểm bằng 0.');return;}
   if(form.record_type==='reward'&&(
     (penalty||redeem)?(!Number.isSafeInteger(amount)||amount>-2):
       (!Number.isSafeInteger(amount)||amount<1)
   )){setError(penalty||redeem?'Phạt hoặc đổi quà phải trừ ít nhất 2 sao nguyên.':'Sao thưởng phải là số nguyên dương.');return;}
   const change=oldStudent?.id===newStudent.id?'':'\nĐổi học sinh: '+(oldStudent?.full_name||'Học sinh cũ')+' → '+newStudent.full_name+'.';
   if(!window.confirm('Xác nhận sửa ghi nhận "'+record.title+'"?'+change+
     '\nSố cũ: '+record.points+' → mới: '+amount+
     '\nThao tác sẽ cập nhật số sao/lỗi và lưu nhật ký sửa đổi.'))return;
   setBusy(true);
   try{
     const {error:err}=await supabase.rpc('ic3_correct_student_record',{
       p_record_id:record.id,
       p_student_id:form.student_id,
       p_record_type:form.record_type,
       p_title:form.title.trim(),
       p_points:amount,
       p_record_date:form.record_date,
       p_note:form.note,
       p_reason:form.reason.trim()
     });
     if(err)throw err;
     onSaved?.('Đã sửa ghi nhận và cập nhật số sao/lỗi của học sinh.');
   }catch(err){setError('Không sửa được: '+(err?.message||String(err)));}
   finally{setBusy(false);}
 }
 return <section className="record-correction-editor" aria-label="Chỉnh sửa ghi nhận">
   <div className="record-correction-head">
     <div><h4>✏️ Sửa ghi nhận đã lưu</h4>
       <p>Thay đúng học sinh, loại ghi nhận hoặc số sao; hệ thống lưu lại thay đổi để đối chiếu.</p></div>
     <button type="button" className="record-correction-close" onClick={onCancel} disabled={busy} aria-label="Đóng chỉnh sửa">×</button>
   </div>
   {recovery?<div className="record-correction-warning">Không hỗ trợ sửa trực tiếp lượt khôi phục lửa vì có quy tắc tính chuỗi. Vui lòng đối soát riêng.</div>:
   <form onSubmit={submit} className="record-correction-form">
     <StudentPicker students={students} selectedId={form.student_id}
       onSelect={id=>setForm(v=>({...v,student_id:id}))}
       disabled={busy} label="🔎 Tìm và chọn học sinh cần nhận ghi nhận này"/>
     <label>Loại ghi nhận
       <select disabled={busy||lockedType} value={form.record_type}
         onChange={e=>setForm(v=>({...v,record_type:e.target.value,points:e.target.value==='violation'?'0':e.target.value==='reward'?'1':v.points}))}>
         <option value="reward">{penalty?'Phạt trừ sao':redeem?'Đã đổi quà':'Sao thưởng / đổi quà'}</option>
         <option value="violation">Lỗi / vi phạm chính thức</option>
         <option value="point">Điểm học tập</option>
       </select>
     </label>
     <label>Nội dung
       <input required maxLength={200} value={form.title} disabled={busy} onChange={e=>setForm(v=>({...v,title:e.target.value}))}/>
     </label>
     <div className="record-correction-two">
       <label>{form.record_type==='violation'?'Số điểm (0)':form.record_type==='reward'?(penalty||redeem?'Số sao trừ':'Sao thưởng'):'Điểm học tập'}
         <input type="number" required step={form.record_type==='point'?'any':'1'}
           min={form.record_type==='violation'?'0':form.record_type==='reward'&&!lockedType?'1':undefined}
           max={form.record_type==='violation'?'0':form.record_type==='reward'&&lockedType?'-2':undefined}
           disabled={busy||form.record_type==='violation'}
           value={form.points} onChange={e=>setForm(v=>({...v,points:e.target.value}))}/>
       </label>
       <label>Ngày ghi nhận
         <input type="date" required value={form.record_date} disabled={busy} onChange={e=>setForm(v=>({...v,record_date:e.target.value}))}/>
       </label>
     </div>
     <label>Ghi chú
       <textarea rows={2} maxLength={1500} disabled={busy} value={form.note} onChange={e=>setForm(v=>({...v,note:e.target.value}))}/>
     </label>
     <label>Lý do chỉnh sửa (bắt buộc)
       <textarea rows={2} required minLength={5} maxLength={500} disabled={busy} value={form.reason}
         onChange={e=>setForm(v=>({...v,reason:e.target.value}))} placeholder="Ví dụ: Giáo viên chọn nhầm tên học sinh khi cộng sao."/>
     </label>
     {error&&<p role="alert" className="record-correction-error">{error}</p>}
     <p className="record-correction-note">Đổi sang học sinh khác sẽ chuyển chính ghi nhận cũ, không cộng/trừ thêm bản ghi. Các biên bản đã xác nhận được bảo vệ.</p>
     <div className="record-correction-actions">
       <button type="button" className="btn outline" onClick={onCancel} disabled={busy}>Hủy</button>
       <button type="submit" className="btn primary" disabled={busy||!form.student_id}>{busy?'Đang cập nhật…':'Xác nhận sửa ghi nhận'}</button>
     </div>
   </form>}
 </section>;
}
