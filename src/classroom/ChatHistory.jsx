import React, {useLayoutEffect, useRef} from 'react';

export default function ChatHistory({latestId, children}) {
 const panel = useRef(null);
 const atBottom = useRef(true);
 useLayoutEffect(() => {
  panel.current.scrollTop = panel.current.scrollHeight;
  atBottom.current = true;
 }, [latestId]);
 return <div ref={panel} className="classroom-messages" aria-label="Lịch sử trò chuyện"
  onScroll={({currentTarget: el}) => {
   atBottom.current = el.scrollHeight - el.clientHeight - el.scrollTop < 8;
  }}
  onLoadCapture={() => {
   if (atBottom.current) panel.current.scrollTop = panel.current.scrollHeight;
  }}>
  {children}
 </div>;
}
