import React,{useEffect,useMemo,useRef,useState} from 'react';
import * as XLSX from 'xlsx';
import {MessageCircle,Send,X,BookOpen,ChevronDown,ArrowUpRight,RotateCcw,Paperclip,FileText} from 'lucide-react';
import {supabase} from './lib/supabase';
import {helpQuestions,visibleHelpTopics,helpPageTitles} from './lib/helpKnowledge';

const allowedExt=/\.(png|jpe?g|webp|pdf|xlsx?|csv|tsv|txt|docx|pptx)$/i;
const fileMime=file=>{
 const ext=file.name.split('.').at(-1).toLowerCase();
 return ({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',pdf:'application/pdf',
  docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'})[ext]||file.type;
};
const toBase64=file=>new Promise((resolve,reject)=>{
 const reader=new FileReader();
 reader.onload=()=>resolve(String(reader.result).split(',')[1]);
 reader.onerror=()=>reject(new Error('Không đọc được tệp. Bạn thử chọn lại nhé.'));
 reader.readAsDataURL(file);
});
async function prepareAttachment(file){
 if(!file)return null;
 if(file.size>2.5*1024*1024)throw new Error('Tệp vượt 2,5 MB. Bạn hãy nén hoặc chia nhỏ tệp.');
 if(!allowedExt.test(file.name))throw new Error('Hỗ trợ JPG, PNG, WebP, PDF, Excel, Word DOCX, PowerPoint PPTX, CSV và TXT.');
 const ext=file.name.split('.').at(-1).toLowerCase();
 if(['txt','csv','tsv'].includes(ext))return {name:file.name,text:(await file.text()).slice(0,55000)};
 if(['xls','xlsx'].includes(ext)){
   const workbook=XLSX.read(new Uint8Array(await file.arrayBuffer()),{type:'array'});
   const extracted=workbook.SheetNames.slice(0,4).map(sheet=>
     'Sheet: '+sheet+'\n'+XLSX.utils.sheet_to_csv(workbook.Sheets[sheet],{blankrows:false})
   ).join('\n\n').slice(0,55000);
   return {name:file.name,text:extracted};
 }
 return {name:file.name,mimeType:fileMime(file),base64:await toBase64(file)};
}
function BoldText({value}){
 return <>{String(value||'').split(/(\*\*[^*\n]+\*\*)/g).map((chunk,i)=>
   chunk.startsWith('**')&&chunk.endsWith('**')?<strong key={i}>{chunk.slice(2,-2)}</strong>:<React.Fragment key={i}>{chunk}</React.Fragment>
 )}</>;
}
export function HelpAssistant({profile,page,onNavigate}){
  const [open,setOpen]=useState(false);
  const [tab,setTab]=useState('chat');
  const [text,setText]=useState('');
  const [file,setFile]=useState(null);
  const [imageUrl,setImageUrl]=useState('');
  const [consent,setConsent]=useState(false);
  const fileInput=useRef(null);
  const [messages,setMessages]=useState([]);
  const [pending,setPending]=useState(false);
  const [query,setQuery]=useState('');
  const [expanded,setExpanded]=useState(page||'dashboard');
  const chatEnd=useRef(null),inputRef=useRef(null);
  const topics=useMemo(()=>visibleHelpTopics(profile.role),[profile.role]);
  useEffect(()=>{
    if(!file||!/^image\//.test(file.type)){setImageUrl('');return;}
    const url=URL.createObjectURL(file);setImageUrl(url);
    return()=>URL.revokeObjectURL(url);
  },[file]);
  const suggestions=useMemo(()=>{
    const current=helpQuestions.filter(x=>x.page===page);
    return [...current,...helpQuestions.filter(x=>x.page!==page)].slice(0,4);
  },[page]);
  const listed=useMemo(()=>{
    const normalized=query.trim().toLocaleLowerCase('vi');
    if(!normalized)return topics;
    return topics.filter(topic=>[topic.title,topic.summary,...topic.keywords,...topic.steps].join(' ').toLocaleLowerCase('vi').includes(normalized));
  },[query,topics]);
  useEffect(()=>{if(open){inputRef.current?.focus();chatEnd.current?.scrollIntoView({block:'nearest'});}},[open,tab,messages.length,pending]);
  useEffect(()=>{
    if(!open)return;
    const listener=e=>{if(e.key==='Escape')setOpen(false);};
    document.addEventListener('keydown',listener);
    return()=>document.removeEventListener('keydown',listener);
  },[open]);
  function go(id){
    if(!topics.some(t=>t.id===id)||!helpPageTitles[id])return;
    onNavigate(id);
    setOpen(false);
  }
  async function ask(question){
    const message=String(question||'').trim();
    if((!message&&!file)||pending)return;
    if(file&&!consent){setMessages(m=>[...m,{role:'system',text:'Hãy tích đồng ý gửi tệp đến Gemini trước khi hỏi AI.'}].slice(-30));return;}
    if(message.length>1300){setMessages(m=>[...m,{role:'system',text:'Câu hỏi dài quá 1300 ký tự, bạn rút gọn giúp tui nhé.'}].slice(-30));return;}
    const last=messages.filter(m=>m.role==='user'||m.role==='assistant').map(m=>({role:m.role,text:m.text})).slice(-8);
    setText('');
    const userText=message||(file?'Hãy xem tệp đính kèm và hướng dẫn tôi thực hiện thao tác trong đó.':'');
    setMessages(m=>[...m,{role:'user',text:userText,attachmentName:file?.name||null}].slice(-30));
    setPending(true);
    try{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session?.access_token)throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
      const upload=await prepareAttachment(file);
      const res=await fetch('/api/help',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
        body:JSON.stringify({question:userText,page,history:last,attachment:upload})
      });
      const result=await res.json().catch(()=>({error:'Máy chủ chưa trả về dữ liệu hợp lệ.'}));
      if(!res.ok)throw new Error(result.error||'Trợ lý tạm thời không phản hồi.');
      const nextPage=topics.some(t=>t.id===result.page_id)&&helpPageTitles[result.page_id]?result.page_id:null;
      setMessages(m=>[...m,{role:'assistant',text:result.answer||'Tui chưa có câu trả lời phù hợp.',page_id:nextPage}].slice(-30));
      setFile(null);setConsent(false);
      if(fileInput.current)fileInput.current.value='';
    }catch(error){
      setMessages(m=>[...m,{role:'system',text:error?.message||'Không thể kết nối AI. Bạn thử lại nhé.'}].slice(-30));
    }finally{setPending(false);}
  }
  return <div className={'help-dock '+(open?'help-open':'')}>
    {!open&&<button type="button" className="help-launch" onClick={()=>setOpen(true)} aria-label="Mở trợ lý AI hướng dẫn sử dụng IC3 GS6" title="Hỏi AI cách sử dụng web">
      <MessageCircle size={21}/><span>Hỏi AI</span>
    </button>}
    {open&&<section className="help-panel" role="dialog" aria-modal="false" aria-label="Trợ lý AI hướng dẫn sử dụng IC3 GS6">
      <header className="help-header">
        <div className="help-avatar">AI</div>
        <div className="help-head-copy"><strong>Trợ lý IC3 AI</strong><span>Hướng dẫn sử dụng website</span></div>
        <button className="help-icon-button" title="Đóng trợ lý" aria-label="Đóng trợ lý" onClick={()=>setOpen(false)}><X size={19}/></button>
      </header>
      <div className="help-tabs" role="tablist" aria-label="Các cách xem hướng dẫn">
        <button role="tab" aria-selected={tab==='chat'} className={tab==='chat'?'selected':''} onClick={()=>setTab('chat')}><MessageCircle size={15}/> Hỏi AI</button>
        <button role="tab" aria-selected={tab==='guide'} className={tab==='guide'?'selected':''} onClick={()=>setTab('guide')}><BookOpen size={15}/> Hướng dẫn nhanh</button>
      </div>
      {tab==='chat'?<>
        <div className="help-chat-scroll" role="log" aria-live="polite" aria-relevant="additions text">
          <div className="help-welcome">
            <strong>Chào bạn! Tui là trợ lý IC3 GS6 👋</strong>
            <p>Bạn cần làm thao tác nào? Cứ hỏi tự nhiên, tui sẽ chỉ đúng mục và các bước trên website.</p>
            <span>Đang xem: {helpPageTitles[page]||'IC3 GS6'}</span>
          </div>
          {!messages.length&&<div className="help-suggestions">
            {suggestions.map(item=><button type="button" key={item.title} onClick={()=>ask(item.question)} disabled={pending}>{item.title}</button>)}
          </div>}
          {messages.map((msg,i)=><div key={i} className={'help-message '+(msg.role==='user'?'mine':msg.role==='system'?'error':'theirs')}>
            {msg.role==='assistant'&&<span className="help-speaker">Trợ lý AI</span>}
            <p><BoldText value={msg.text}/></p>{msg.attachmentName&&<span className="help-attached-name">Tệp: {msg.attachmentName}</span>}
            {msg.page_id&&<button className="help-go" type="button" onClick={()=>go(msg.page_id)}>
              Mở mục {helpPageTitles[msg.page_id]} <ArrowUpRight size={14}/>
            </button>}
          </div>)}
          {pending&&<div className="help-message theirs"><span className="help-speaker">Trợ lý AI</span><p>Đang tìm hướng dẫn phù hợp…</p></div>}
          <div ref={chatEnd}/>
        </div>
        {file&&<div className="help-file-preview">
          {imageUrl?<img src={imageUrl} alt="Ảnh đính kèm đang chọn"/>:<FileText size={20}/>}
          <span title={file.name}>{file.name}</span>
          <button type="button" onClick={()=>{setFile(null);setConsent(false);if(fileInput.current)fileInput.current.value='';}} aria-label="Bỏ tệp đính kèm"><X size={16}/></button>
        </div>}
        {file&&<label className="help-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Tôi đồng ý gửi tệp này cho Google Gemini để nhận hướng dẫn.</label>}
        <form className="help-composer" onSubmit={e=>{e.preventDefault();ask(text);}}>
          <input ref={fileInput} type="file" style={{display:'none'}} accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.csv,.tsv,.txt,.docx,.pptx" onChange={e=>{setFile(e.target.files?.[0]||null);setConsent(false);}}/>
          <button type="button" className="help-attach-button" onClick={()=>fileInput.current?.click()} disabled={pending} aria-label="Đính kèm hình ảnh hoặc tệp" title="Đính kèm ảnh, PDF, Word, Excel…"><Paperclip size={19}/></button>
          <textarea ref={inputRef} value={text} rows={2} maxLength={1300} disabled={pending}
            aria-label="Nhập câu hỏi cho trợ lý AI"
            placeholder="Hỏi cách sử dụng website…"
            onChange={e=>setText(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(text);}}}/>
          <button type="submit" disabled={pending||(!text.trim()&&!file)||(file&&!consent)} title="Gửi câu hỏi" aria-label="Gửi câu hỏi"><Send size={18}/></button>
        </form>
        <footer className="help-footer">
          <span>AI chỉ hướng dẫn, không tự thay đổi dữ liệu.</span>
          {!!messages.length&&<button type="button" onClick={()=>{setMessages([]);setText('');setFile(null);setConsent(false);}} disabled={pending}><RotateCcw size={12}/> Chat mới</button>}
        </footer>
      </>:<>
        <div className="help-guide">
          <label className="help-search-label">
            <span className="sr-only">Tìm trong hướng dẫn</span>
            <input value={query} placeholder="Tìm theo chức năng…" onChange={e=>setQuery(e.target.value)}/>
          </label>
          <div className="help-guide-items">
            {listed.map(topic=><article key={topic.id} className="help-topic">
              <button type="button" className="help-topic-trigger" aria-expanded={expanded===topic.id} onClick={()=>setExpanded(id=>id===topic.id?'':topic.id)}>
                <span>{topic.title}</span><ChevronDown size={16} className={expanded===topic.id?'rotated':''}/>
              </button>
              {expanded===topic.id&&<div className="help-topic-content">
                <p><BoldText value={topic.summary}/></p>
                <ol>{topic.steps.map((line,i)=><li key={i}><BoldText value={line}/></li>)}</ol>
                {topic.notes?.map((note,i)=><p key={i} className="help-note">{note}</p>)}
                {helpPageTitles[topic.id]&&<button className="help-go" type="button" onClick={()=>go(topic.id)}>Đến mục {topic.title} <ArrowUpRight size={14}/></button>}
              </div>}
            </article>)}
            {!listed.length&&<p className="help-no-results">Chưa tìm thấy trong sổ tay. Bạn có thể chuyển sang Hỏi AI để mô tả rõ hơn.</p>}
          </div>
        </div>
        <footer className="help-footer">Sổ tay hướng dẫn có sẵn, không tốn lượt hỏi Gemini.</footer>
      </>}
    </section>}
  </div>;
}
