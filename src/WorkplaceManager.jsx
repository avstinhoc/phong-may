import React,{useState} from 'react';
import {Building2,School,Plus,Trash2,ImagePlus,ArrowRight,Link2Off} from 'lucide-react';
import {supabase} from './lib/supabase';
import {groupSchoolNames,schoolNameKey} from './lib/workplaceReports';
import {provisionSchoolWorkbook} from './lib/sheetProvision';

const KIND_LABEL={company:'Công ty',center:'Trung tâm'};
const clean=value=>String(value||'').trim().replace(/\s+/g,' ');

export function WorkplaceManager({profile,schools=[],workplaces=[],links=[],ping,onChanged,onGoSchools}){
 const [name,setName]=useState('');
 const [kind,setKind]=useState('company');
 const [busy,setBusy]=useState(false);
 const [editing,setEditing]=useState(null);
 const [deleting,setDeleting]=useState(null);
 const [confirmation,setConfirmation]=useState('');
 const [chosenSchools,setChosenSchools]=useState({});
 const [newSchoolNames,setNewSchoolNames]=useState({});
 const ordered=[...workplaces].sort((a,b)=>a.name.localeCompare(b.name,'vi'));

 const perform=async(task,success)=>{
  setBusy(true);
  try{
   await task();
   if(success)ping(success);
   onChanged?.();
  }catch(err){ping(err?.message||'Có lỗi khi cập nhật đơn vị công tác.');}
  finally{setBusy(false);}
 };
 async function create(e){
  e.preventDefault();
  const label=clean(name);
  if(label.length<2||label.length>150){ping('Tên đơn vị phải từ 2 đến 150 ký tự.');return;}
  await perform(async()=>{
   const {error}=await supabase.from('workplaces').insert({
    name:label,kind,created_by:profile.id
   });
   if(error)throw error;
   setName('');
  },'Đã thêm '+(KIND_LABEL[kind]||'đơn vị')+' '+label);
 }
 async function rename(e){
  e.preventDefault();if(!editing)return;
  const label=clean(editing.name);
  if(label.length<2||label.length>150){ping('Tên đơn vị phải từ 2 đến 150 ký tự.');return;}
  await perform(async()=>{
   const {error}=await supabase.from('workplaces')
    .update({name:label,kind:editing.kind}).eq('id',editing.id);
   if(error)throw error;
   setEditing(null);
  },'Đã cập nhật thông tin đơn vị');
 }
 async function remove(e){
  e.preventDefault();if(!deleting||confirmation!==deleting.name)return;
  await perform(async()=>{
   const {error}=await supabase.from('workplaces').delete().eq('id',deleting.id);
   if(error)throw error;
   setDeleting(null);setConfirmation('');
  },'Đã xóa đơn vị công tác. Các trường, lớp, học sinh và lịch vẫn được giữ nguyên.');
 }
 async function attach(unit,group){
  if(!group?.ids?.length)return;
  await perform(async()=>{
   const {error}=await supabase.from('workplace_schools').upsert(
    group.ids.map(school_id=>({workplace_id:unit.id,school_id})),
    {onConflict:'workplace_id,school_id',ignoreDuplicates:true}
   );
   if(error)throw error;
  },'Đã gắn '+group.name+' vào '+unit.name+' (giữ nguyên các hồ sơ trường).');
 }
 async function detach(unit,group){
  if(!group?.ids?.length)return;
  if(!window.confirm('Bỏ liên kết '+group.name+' khỏi '+unit.name+'? '+group.ids.length+' hồ sơ trường sẽ được gỡ khỏi nhóm; học sinh, lớp, lịch và điểm không bị xóa.'))return;
  await perform(async()=>{
   const {error}=await supabase.from('workplace_schools').delete()
    .eq('workplace_id',unit.id).in('school_id',group.ids);
   if(error)throw error;
  },'Đã gỡ '+group.name+' khỏi '+unit.name+'; không xóa dữ liệu trường.');
 }
 async function createSchool(unit){
  const newName=clean(newSchoolNames[unit.id]);
  if(!newName){ping('Nhập tên trường trước khi thêm.');return;}
  if(schools.some(s=>schoolNameKey(s.name)===schoolNameKey(newName))){
   ping('Trường '+newName+' đã có trong danh sách. Hãy dùng Gắn trường để tránh tạo trùng hồ sơ.');
   return;
  }
  await perform(async()=>{
   // Reuse the current authenticated user's school creation and membership flow.
   const {data:schoolId,error:schoolError}=await supabase.rpc('create_my_school',{school_name:newName});
   if(schoolError)throw schoolError;
   const {error:linkError}=await supabase.from('workplace_schools').upsert(
    {workplace_id:unit.id,school_id:schoolId},
    {onConflict:'workplace_id,school_id',ignoreDuplicates:true}
   );
   if(linkError)throw new Error('Trường đã tạo nhưng chưa gắn với đơn vị: '+linkError.message);
   const linked=await provisionSchoolWorkbook(supabase,schoolId);
   if(!linked.ok)ping('Trường đã tạo. '+linked.message);
   setNewSchoolNames(values=>({...values,[unit.id]:''}));
  },'Đã thêm trường '+newName+' vào '+unit.name);
 }
 async function updateLogo(unit,file){
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024){
   ping('Logo phải là JPG, PNG hoặc WebP, không quá 3 MB.');return;
  }
  await perform(async()=>{
   const url=URL.createObjectURL(file);
   const img=new Image();
   try{await new Promise((resolve,reject)=>{
    img.onload=resolve;img.onerror=reject;img.src=url;
   });}finally{URL.revokeObjectURL(url);}
   const scale=Math.min(1,180/img.naturalWidth,130/img.naturalHeight);
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
   const data=canvas.toDataURL('image/png');
   if(data.length>220000)throw new Error('Logo sau khi nén vẫn quá lớn. Hãy thử ảnh đơn giản hơn.');
   const {error}=await supabase.from('workplaces').update({logo_data:data}).eq('id',unit.id);
   if(error)throw error;
  },'Đã cập nhật logo '+unit.name);
 }
 async function clearLogo(unit){
  await perform(async()=>{
   const {error}=await supabase.from('workplaces').update({logo_data:null}).eq('id',unit.id);
   if(error)throw error;
  },'Đã bỏ logo '+unit.name);
 }

 return <section className="workplace-manager">
  <div className="workplace-hero">
   <span className="workplace-hero-mark"><Building2 size={25}/></span>
   <div><h2>Công ty / Trung tâm công tác</h2>
    <p>Quản lý đơn vị như AVS và các trường trực thuộc. Mỗi trường vẫn có lớp, lịch dạy và học sinh riêng.</p>
   </div>
  </div>
  <div className="panel workplace-create">
   <div><h3>Thêm đơn vị công tác</h3><p className="muted">Ví dụ: Công ty AVS hoặc Trung tâm Tin học Quốc tế.</p></div>
   <form onSubmit={create} className="workplace-create-form">
    <label>Loại đơn vị<select aria-label="Loại đơn vị" value={kind} disabled={busy} onChange={e=>setKind(e.target.value)}>
     <option value="company">Công ty</option><option value="center">Trung tâm</option>
    </select></label>
    <label>Tên công ty / trung tâm<input required maxLength={150} placeholder="Ví dụ: AVS"
     value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label>
    <button className="btn primary" disabled={busy||clean(name).length<2}><Plus size={16}/>Thêm đơn vị</button>
   </form>
  </div>
  <div className="workplace-list-heading"><h3>Đơn vị đang quản lý</h3><span>{ordered.length} đơn vị</span></div>
  {!ordered.length&&<div className="panel workplace-empty">
    <Building2 size={28}/><strong>Chưa có công ty hoặc trung tâm</strong>
    <p>Thêm AVS rồi chọn các trường công tác như THCS Duy Tân, THCS Vũng Tàu để gom lại một nơi.</p>
  </div>}
  <div className="workplace-card-grid">{ordered.map(unit=>{
   const assignedIds=new Set(links.filter(l=>l.workplace_id===unit.id).map(l=>l.school_id));
   const assigned=schools.filter(s=>assignedIds.has(s.id));
   const assignedGroups=groupSchoolNames(assigned);
   const remainingGroups=groupSchoolNames(schools.filter(s=>!assignedIds.has(s.id)));
   const selectedKey=remainingGroups.some(g=>g.key===chosenSchools[unit.id])
    ?chosenSchools[unit.id]:remainingGroups[0]?.key||'';
   const selectedGroup=remainingGroups.find(g=>g.key===selectedKey);
   return <article className="panel workplace-card" key={unit.id}>
    <div className="workplace-card-heading">
     <span className="workplace-logo">
      {unit.logo_data?<img src={unit.logo_data} alt={'Logo '+unit.name}/>:<Building2 size={25}/>}
     </span>
     <div className="workplace-card-title">
      <small>{KIND_LABEL[unit.kind]||'Đơn vị công tác'}</small>
      <h3>{unit.name}</h3>
      <span>{assignedGroups.length} trường công tác</span>
     </div>
     <div className="workplace-card-actions">
      <button type="button" className="mini-btn" disabled={busy} onClick={()=>setEditing({...unit})}>Sửa</button>
      <button type="button" className="mini-btn danger" disabled={busy} onClick={()=>{setDeleting(unit);setConfirmation('');}}>Xóa</button>
     </div>
    </div>
    <div className="workplace-logo-actions">
     <label className="mini-btn"><ImagePlus size={14}/> {unit.logo_data?'Thay logo':'Thêm logo'}
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} hidden onChange={e=>{updateLogo(unit,e.target.files?.[0]);e.target.value='';}}/>
     </label>
     {unit.logo_data&&<button className="mini-btn" disabled={busy} onClick={()=>clearLogo(unit)}>Bỏ logo</button>}
    </div>
    <div className="workplace-schools-heading"><School size={17}/><strong>Trường thuộc {unit.name}</strong></div>
    <div className="workplace-schools">
     {assignedGroups.map(group=><div className="workplace-school-row" key={group.key}>
      <span><School size={15}/><span>{group.name}
       {group.ids.length>1&&<small className="workplace-duplicate-count" title="Các hồ sơ cùng tên vẫn giữ nguyên dữ liệu riêng">{group.ids.length} hồ sơ được tổng hợp</small>}
      </span></span>
      <button type="button" className="mini-btn" title="Chỉ gỡ tất cả liên kết trùng tên, không xóa trường" disabled={busy} onClick={()=>detach(unit,group)}><Link2Off size={14}/> Bỏ liên kết</button>
     </div>)}
     {!assignedGroups.length&&<p className="muted">Chưa liên kết trường nào.</p>}
    </div>
    <div className="workplace-school-add">
     <label>Thêm trường đã có
      <div className="workplace-attach-row">
       <select value={selectedKey} disabled={busy||!remainingGroups.length}
        onChange={e=>setChosenSchools(v=>({...v,[unit.id]:e.target.value}))}>
        {!remainingGroups.length&&<option value="">Đã liên kết tất cả trường</option>}
        {remainingGroups.map(g=><option key={g.key} value={g.key}>{g.name}</option>)}
       </select>
       <button type="button" className="btn outline" disabled={busy||!selectedGroup} onClick={()=>attach(unit,selectedGroup)}>Gắn trường</button>
      </div>
     </label>
     <label>Hoặc tạo trường mới thuộc đơn vị
      <div className="workplace-attach-row">
       <input placeholder="Ví dụ: THCS Vũng Tàu" maxLength={200} disabled={busy}
        value={newSchoolNames[unit.id]||''}
        onChange={e=>setNewSchoolNames(v=>({...v,[unit.id]:e.target.value}))}/>
       <button className="btn outline" disabled={busy||!clean(newSchoolNames[unit.id])} onClick={()=>createSchool(unit)} type="button">Tạo trường</button>
      </div>
     </label>
    </div>
   </article>;
  })}</div>
  <p className="workplace-safe-note"><ArrowRight size={16}/> Xóa công ty/trung tâm hoặc bỏ liên kết trường <b>không xóa</b> học sinh, điểm, lịch dạy hay hồ sơ trường. Đơn vị chỉ nhóm các trường bạn có quyền quản lý.</p>
  <button className="btn outline" onClick={onGoSchools} type="button"><School size={16}/>Đến Trường công tác</button>

  {editing&&<div className="modal-backdrop"><div className="modal">
   <div className="modal-head"><h3>Sửa đơn vị công tác</h3><button className="btn outline" type="button" onClick={()=>setEditing(null)}>Đóng</button></div>
   <form className="form-stack" onSubmit={rename}>
    <label>Loại đơn vị<select value={editing.kind} onChange={e=>setEditing({...editing,kind:e.target.value})}>
     <option value="company">Công ty</option><option value="center">Trung tâm</option>
    </select></label>
    <label>Tên đơn vị<input required maxLength={150} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label>
    <button type="submit" className="btn primary" disabled={busy||clean(editing.name).length<2}>Lưu thay đổi</button>
   </form>
  </div></div>}
  {deleting&&<div className="modal-backdrop"><div className="modal">
   <div className="modal-head"><h3>Xóa đơn vị {deleting.name}</h3><button className="btn outline" type="button" onClick={()=>setDeleting(null)}>Đóng</button></div>
   <p className="muted">Chỉ xóa nhóm công tác và liên kết với trường, <b>không xóa bất cứ trường hay học sinh nào</b>. Nhập đúng tên đơn vị để xác nhận:</p>
   <form className="form-stack" onSubmit={remove}>
    <label>Tên đơn vị <b>{deleting.name}</b><input required value={confirmation} autoComplete="off" onChange={e=>setConfirmation(e.target.value)}/></label>
    <button type="submit" className="btn danger" disabled={busy||confirmation!==deleting.name}><Trash2 size={15}/>Xóa đơn vị, giữ nguyên trường</button>
   </form>
  </div></div>}
 </section>;
}
