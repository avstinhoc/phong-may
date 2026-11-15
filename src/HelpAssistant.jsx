import React,{useEffect,useMemo,useRef,useState} from 'react';
import {MessageCircle,Send,X,BookOpen,ChevronDown,ArrowUpRight,RotateCcw} from 'lucide-react';
import {supabase} from './lib/supabase';
import {helpQuestions,visibleHelpTopics,helpPageTitles} from './lib/helpKnowledge';

export function HelpAssistant({profile,page,onNavigate}){
  const [open,setOpen]=useState(false);
  const [tab,setTab]=useState('chat');
  const [text,setText]=useState('');
  const [messages,setMessages]=useState([]);
  const [pending,setPending]=useState(false);
  const [query,setQuery]=useState('');
  const [expanded,setExpanded]=useState(page||'dashboard');
  const chatEnd=useRef(null),inputRef=useRef(null);
  const topics=useMemo(()=>visibleHelpTopics(profile.role),[profile.role]);
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
    if(!message||pending)return;
    if(message.length>1300){setMessages(m=>[...m,{role:'system',text:'Câu hỏi dài quá 1300 ký tự, bạn rút gọn giúp tui nhé.'}].slice(-30));return;}
    const last=messages.filter(m=>m.role==='user'||m.role==='assistant').map(m=>({role:m.role,text:m.text})).slice(-8);
    setText('');
    setMessages(m=>[...m,{role:'user',text:message}].slice(-30));
    setPending(true);
    try{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session?.access_token)throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
      const res=await fetch('/api/help',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
        body:JSON.stringify({question:message,page,history:last})
      });
      const result=await res.json().catch(()=>({error:'Máy chủ chưa trả về dữ liệu hợp lệ.'}));
      if(!res.ok)throw new Error(result.error||'Trợ lý tạm thời không phản hồi.');
      const nextPage=topics.some(t=>t.id===result.page_id)&&helpPageTitles[result.page_id]?result.page_id:null;
      setMessages(m=>[...m,{role:'assistant',text:result.answer||'Tui chưa có câu trả lời phù hợp.',page_id:nextPage}].slice(-30));
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
        <div className="help-head-copy"><strong>Trợ lý IC3 GS6</strong><span>Hướng dẫn sử dụng website</span></div>
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
            <p>{msg.text}</p>
            {msg.page_id&&<button className="help-go" type="button" onClick={()=>go(msg.page_id)}>
              Mở mục {helpPageTitles[msg.page_id]} <ArrowUpRight size={14}/>
            </button>}
          </div>)}
          {pending&&<div className="help-message theirs"><span className="help-speaker">Trợ lý AI</span><p>Đang tìm hướng dẫn phù hợp…</p></div>}
          <div ref={chatEnd}/>
        </div>
        <form className="help-composer" onSubmit={e=>{e.preventDefault();ask(text);}}>
          <textarea ref={inputRef} value={text} rows={2} maxLength={1300} disabled={pending}
            aria-label="Nhập câu hỏi cho trợ lý AI"
            placeholder="Hỏi cách sử dụng website…"
            onChange={e=>setText(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(text);}}}/>
          <button type="submit" disabled={pending||!text.trim()} title="Gửi câu hỏi" aria-label="Gửi câu hỏi"><Send size={18}/></button>
        </form>
        <footer className="help-footer">
          <span>AI chỉ hướng dẫn, không tự thay đổi dữ liệu.</span>
          {!!messages.length&&<button type="button" onClick={()=>{setMessages([]);setText('');}} disabled={pending}><RotateCcw size={12}/> Chat mới</button>}
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
                <p>{topic.summary}</p>
                <ol>{topic.steps.map((line,i)=><li key={i}>{line}</li>)}</ol>
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
