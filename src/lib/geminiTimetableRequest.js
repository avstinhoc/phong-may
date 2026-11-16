// Retry only transient Gemini outages; never re-send on quota or auth errors.
export class GeminiTimetableError extends Error {
  constructor(message,status=502){super(message);this.name='GeminiTimetableError';this.status=status;}
}

export async function requestTimetableGemini({
  apiKey,model='gemini-2.5-flash',fallbackModel='gemini-2.5-flash-lite',
  parts,fetcher=fetch,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
}){
  if(!apiKey)throw new GeminiTimetableError('Máy chủ chưa có GEMINI_API_KEY. Vui lòng kiểm tra Vercel Environment Variables.',503);
  if(!/^gemini-[a-z0-9.-]+$/.test(model))throw new GeminiTimetableError('Tên model Gemini không hợp lệ.',503);
  const fallback=/^gemini-[a-z0-9.-]+$/.test(fallbackModel)&&fallbackModel!==model?fallbackModel:null;
  const attempts=[{model,timeout:18000},{model,timeout:17000},...(fallback?[{model:fallback,timeout:14000}]:[])];
  const payload=JSON.stringify({
    contents:[{parts}],generationConfig:{temperature:0.1,responseMimeType:'application/json'}
  });
  let lastStatus=503;
  for(let i=0;i<attempts.length;i++){
    const current=attempts[i];
    let response;
    try{
      response=await fetcher('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(current.model)+':generateContent',{
        method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
        body:payload,signal:AbortSignal.timeout(current.timeout)
      });
    }catch(err){
      lastStatus=504;
      if(i===attempts.length-1)break;
      await delay(350*(i+1));
      continue;
    }
    if(response.ok){
      let data;
      try{data=await response.json();}
      catch{throw new GeminiTimetableError('Gemini trả dữ liệu không hợp lệ. Bạn thử đọc lại tệp.',502);}
      return {data,model:current.model,fallbackUsed:current.model!==model};
    }
    const status=response.status;
    lastStatus=status;
    // Quota, permissions, invalid models and invalid input are not solved by retrying.
    if(status===429)throw new GeminiTimetableError('Gemini đang vượt hạn mức hoặc giới hạn tốc độ (429). Hãy kiểm tra hạn mức API hoặc thử lại sau.',429);
    if(status===401||status===403)throw new GeminiTimetableError('API key Gemini không được cấp quyền (HTTP '+status+'). Kiểm tra GEMINI_API_KEY trong Vercel.',502);
    if(status===404)throw new GeminiTimetableError('Không tìm thấy model '+current.model+'. Kiểm tra GEMINI_MODEL trên Vercel.',502);
    if(status===400||status===413)throw new GeminiTimetableError('Gemini từ chối dữ liệu gửi lên (HTTP '+status+'). Hãy giảm kích thước hoặc kiểm tra định dạng tệp.',400);
    if(![500,502,503,504].includes(status))
      throw new GeminiTimetableError('Gemini trả lỗi HTTP '+status+'.',502);
    if(i<attempts.length-1)await delay(350*(i+1));
  }
  throw new GeminiTimetableError(lastStatus===504
    ?'Gemini phản hồi quá lâu. Hãy thử tệp nhỏ hơn hoặc chọn chế độ đọc trên thiết bị.'
    :'Gemini tạm quá tải (HTTP '+lastStatus+'); hệ thống đã thử lại và đổi model dự phòng nhưng chưa có phản hồi. Hãy thử lại sau.',lastStatus===504?504:503);
}
