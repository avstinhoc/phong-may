import React,{useState} from 'react';
import {supabase} from './lib/supabase';
import {SCORE_KEYS,validateExtractedRows} from './lib/aiClassImport';

export function AIClassImportDraft({draft,profile,onChange,onCancel,onDone,onMessage}){
 const [checked,setChecked]=useState(false);
 const [overwrite,setOverwrite]=useState(false);
 const [expanded,setExpanded]=useState(false);
 const [busy,setBusy]=useState(false);
 const [newScoreKey,setNewScoreKey]=useState('');
 const isGrades=draft.kind==='grades';
 const rows=draft.rows||[];
 const update=(i,patch)=>onChange({...draft,rows:rows.map((r,j)=>i===j?{...r,...patch}:r)});
 const updateScore=(i,key,value)=>{
  const previous=rows[i].scores||{};
  update(i,{scores:{...previous,[key]:value}});
 };
 const remove=(i)=>onChange({...draft,rows:rows.filter((_,j)=>i!==j)});
 async function confirmImport(){
  if(!checked||busy||!rows.length)return;
  if(profile.school_id!==draft.schoolId){onMessage('Bạn đã đổi trường. Vui lòng tạo bản nháp mới ở trường đúng.');return;}
  let validated;
  try{validated=validateExtractedRows(draft.kind,rows);}
  catch(e){onMessage(e.message);return;}
  if(validated.rows.length!==rows.length||validated.warnings.length){
   onMessage('Bản nháp còn ô thiếu, trùng tên hoặc điểm sai. Hãy sửa hoặc bỏ những dòng lỗi trước khi lưu. '+validated.warnings.slice(0,3).join('; '));
   return;
  }
  const action=isGrades?'cập nhật điểm':'thêm học sinh';
  const text='Xác nhận '+action+' cho '+rows.length+' dòng ở lớp '+draft.className+
   '?\n\nDữ liệu được lưu vào Supabase dưới tài khoản của bạn.'+
   (isGrades&&overwrite?'\nCẢNH BÁO: Bạn đang cho phép ghi đè các cột điểm đã tồn tại.':'\nCác cột điểm đã có sẽ được giữ nguyên.');
  if(!window.confirm(text))return;
  setBusy(true);
  try{
   const {data,error}=await supabase.rpc('ic3_apply_ai_class_import',{
    p_class_id:draft.classId,p_kind:draft.kind,p_rows:validated.rows,
    p_overwrite_scores:isGrades&&overwrite
   });
   if(error)throw error;
   onDone(data);
  }catch(e){onMessage('Không lưu được bản nhập AI: '+(e?.message||'Lỗi không xác định'));}
  finally{setBusy(false);}
 }
 return <section className="help-class-draft" aria-label="Bản nháp dữ liệu học sinh và điểm">
  <div className="help-class-title">
   <div><strong>{isGrades?'Bản nháp bảng điểm':'Bản nháp danh sách học sinh'}</strong>
    <small>Lớp {draft.className} · {rows.length} dòng</small></div>
   <button type="button" className="help-draft-cancel" onClick={onCancel} disabled={busy}>Hủy</button>
  </div>
  <p className="help-class-hint">AI mới đọc dữ liệu, <b>chưa lưu vào hệ thống</b>. Bạn có thể sửa tên, giới tính và điểm. Lớp được khóa theo lựa chọn của giáo viên.</p>
  {!!draft.warnings?.length&&<div className="help-class-warnings">
   <strong>Những điểm cần kiểm tra ({draft.warnings.length})</strong>
   <ul>{draft.warnings.slice(0,7).map((w,i)=><li key={i}>{w}</li>)}</ul>
  </div>}
  {rows.length>12&&<button className="help-show-all" onClick={()=>setExpanded(v=>!v)}>
   {expanded?'Thu gọn danh sách':'Xem tất cả '+rows.length+' dòng để chỉnh sửa'}
  </button>}
  <div className="help-class-list">{(expanded?rows:rows.slice(0,12)).map((r,i)=>
   <article className="help-class-item" key={i}>
    <div className="help-class-row-top">
     <b>Dòng {i+1}</b>
     <span className={'help-row-status '+r.check}>{r.check==='exists'?'Đã có trong lớp':
       r.check==='matched'?'Khớp học sinh':r.check==='not_found'?'Chưa tìm thấy':
       r.check==='ambiguous'?'Trùng nhiều tên':'Cần kiểm tra'}</span>
     <button type="button" onClick={()=>remove(i)} title="Bỏ dòng này">Bỏ</button>
    </div>
    <label>Họ và tên
     <input value={r.full_name||''} onChange={e=>update(i,{full_name:e.target.value,check:''})}
       placeholder="Nguyễn Văn An" maxLength={100}/></label>
    {!isGrades?<div className="help-class-fields">
     <label>Giới tính<select value={r.gender||''} onChange={e=>update(i,{gender:e.target.value})}>
       <option value="">Chưa rõ</option><option value="Nam">Nam</option>
       <option value="Nữ">Nữ</option><option value="Khác">Khác</option>
     </select></label>
     <label>Mã HS (nếu có)<input value={r.student_code||''}
       onChange={e=>update(i,{student_code:e.target.value})} maxLength={40}/></label>
    </div>:<div className="help-class-scores">
     {Object.entries(r.scores||{}).map(([key,value])=>
      <label key={key}>{key}<input inputMode="decimal" type="number" min={0} max={10} step=".01"
       value={value} onChange={e=>updateScore(i,key,e.target.value)} /></label>)}
     <label>Thêm cột điểm<select value="" onChange={e=>{
       if(e.target.value)updateScore(i,e.target.value,'');
     }}><option value="">Chọn cột</option>{SCORE_KEYS.filter(k=>!(k in (r.scores||{}))).map(k=>
       <option key={k} value={k}>{k}</option>)}</select></label>
    </div>}
   </article>)}
  </div>
  {isGrades&&<label className="help-import-overwrite">
   <input type="checkbox" checked={overwrite} onChange={e=>setOverwrite(e.target.checked)}/>
   Cho phép ghi đè những cột điểm đã tồn tại (mặc định giữ điểm cũ)
  </label>}
  <label className="help-import-confirm">
   <input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>
   Tôi đã đối chiếu danh sách/bảng điểm với ảnh hoặc file và đồng ý lưu những dòng đã chọn.
  </label>
  <button type="button" className="help-import-save" disabled={!checked||busy||!rows.length} onClick={confirmImport}>
   {busy?'Đang lưu…':isGrades?'Xác nhận cập nhật điểm':'Xác nhận thêm học sinh'}
  </button>
 </section>;
}
