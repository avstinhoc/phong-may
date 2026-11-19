import React,{useEffect,useId,useMemo,useState} from 'react';
import './StudentPicker.css';

const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('vi').trim();

/** One keyboard-accessible text field for finding AND selecting a real student ID. */
export function StudentPicker({
  students=[],selectedId='',onSelect,onQueryChange,label='🔎 Tìm & chọn học sinh',
  placeholder='Gõ tên học sinh hoặc lớp…',disabled=false,maxResults=12
}){
 const [query,setQuery]=useState('');
 const [open,setOpen]=useState(false);
 const [cursor,setCursor]=useState(0);
 const listId=useId();
 const current=students.find(s=>s.id===selectedId);
 useEffect(()=>{
   if(current)setQuery(current.full_name+' · Lớp '+(current.class_name||'—'));
 },[current?.id,current?.full_name,current?.class_name]);
 const matches=useMemo(()=>{
   const q=clean(query);
   // When a student is already selected, show a short set of alternatives on focus.
   const search=q&&(!current||q!==clean(current.full_name+' · Lớp '+(current.class_name||'—')))?q:'';
   const candidates=students.filter(s=>!search||
     clean(s.full_name+' '+(s.class_name||'')).includes(search));
   if(!search&&current)candidates.sort((a,b)=>(a.id===current.id?-1:b.id===current.id?1:0));
   return candidates.slice(0,maxResults);
 },[students,query,current,maxResults]);
 const choose=student=>{
   setQuery(student.full_name+' · Lớp '+(student.class_name||'—'));
   setOpen(false);
   setCursor(0);
   onSelect(student.id);
   onQueryChange?.('');
 };
 const type=value=>{
   setQuery(value);setOpen(true);setCursor(0);onSelect('');
   onQueryChange?.(value);
 };
 return <div className="student-picker" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
   <label htmlFor={listId+'-input'}>{label}</label>
   <div className="student-picker-field">
     <input id={listId+'-input'} type="search" role="combobox" autoComplete="off"
       aria-label={label} aria-autocomplete="list" aria-expanded={open}
       aria-controls={listId+'-choices'}
       aria-activedescendant={open&&matches[cursor]?listId+'-choice-'+cursor:undefined}
       value={query} placeholder={placeholder} disabled={disabled}
       onFocus={()=>{setOpen(true);setCursor(0);}}
       onChange={e=>type(e.target.value)}
       onKeyDown={e=>{
         if(e.key==='Escape'){setOpen(false);return;}
         if(e.key==='ArrowDown'){e.preventDefault();setOpen(true);setCursor(i=>Math.min(i+1,matches.length-1));}
         if(e.key==='ArrowUp'){e.preventDefault();setCursor(i=>Math.max(i-1,0));}
         if(e.key==='Enter'&&open&&matches[cursor]){e.preventDefault();choose(matches[cursor]);}
       }}/>
     {query&&<button type="button" aria-label="Xóa lựa chọn học sinh"
       onClick={()=>type('')} disabled={disabled} className="student-picker-clear">×</button>}
   </div>
   {open&&!disabled&&<div role="listbox" id={listId+'-choices'} className="student-picker-options"
     aria-label="Danh sách học sinh khớp từ khóa">
     {matches.map((s,i)=><button type="button" role="option"
       key={s.id} id={listId+'-choice-'+i}
       aria-selected={s.id===selectedId}
       className={'student-picker-option '+(cursor===i?'is-active':'')}
       onMouseDown={e=>e.preventDefault()}
       onClick={()=>choose(s)}>
       <span><strong>{s.full_name}</strong><small>Lớp {s.class_name||'—'}</small></span>
       {s.id===selectedId&&<span aria-hidden="true">✓</span>}
     </button>)}
     {!matches.length&&<div className="student-picker-empty">Không tìm thấy học sinh. Kiểm tra tên hoặc chọn lớp khác.</div>}
     {students.length>matches.length&&<small className="student-picker-tip">Nhập thêm tên để thu hẹp danh sách.</small>}
   </div>}
   {current&&<small className="student-picker-selected">✓ Đã chọn: <b>{current.full_name}</b> · Lớp {current.class_name||'—'}</small>}
 </div>;
}
