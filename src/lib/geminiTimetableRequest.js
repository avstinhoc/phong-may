// Gemini 2.5 may return 404 for projects without generation access, even when models.list shows it.
// Try current multimodal models on 404 / transient 5xx without retrying quota or auth failures.
export class GeminiTimetableError extends Error {
  constructor(message,status=502){super(message);this.name='GeminiTimetableError';this.status=status;}
}

const validModel=name=>typeof name==='string'&&/^gemini-[a-z0-9.-]+$/.test(name);
export async function requestTimetableGemini({
  apiKey,model='gemini-3.8-flash',
  fallbackModel='gemini-3.8-flash',secondaryModel='gemini-3.5-flash-lite',
  parts,fetcher=fetch,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
}){
  if(!apiKey)throw new GeminiTimetableError('Máy chủ chưa có GEMINI_API_KEY. Vui lòng kiểm tra Vercel Environment Variables.',503);
  if(!validModel(model))throw new GeminiTimetableError('Tên model Gemini được cấu hình không hợp lệ.',503);
  const models=[...new Set([model,fallbackModel,secondaryModel].filter(validModel))];
  const payload=JSON.stringify({
    contents:[{parts}],generationConfig:{temperature:0.1,responseMimeType:'application/json'}
  });
  let lastStatus=503;
  const errors=[];
  for(let i=0;i<models.length;i++){
    const candidate=models[i];
    // Only retry the primary model once on temporary failure. 404 should switch model immediately.
    const maxAttempts=i===0?2:1;
    for(let attempt=0;attempt<maxAttempts;attempt++){
      let response;
      try{
        response=await fetcher('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(candidate)+':generateContent',{
          method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
          body:payload,signal:AbortSignal.timeout(i===0?(attempt?9000:13000):11000)
        });
      }catch(err){
        lastStatus=504;
        errors.push(candidate+' HTTP 504');
        if(attempt+1<maxAttempts)await delay(350);
        continue;
      }
      if(response.ok){
        let data;
        try{data=await response.json();}
        catch{throw new GeminiTimetableError('Gemini trả dữ liệu không hợp lệ. Bạn thử đọc lại tệp.',502);}
        return {data,model:candidate,fallbackUsed:candidate!==model};
      }
      lastStatus=response.status;
      errors.push(candidate+' HTTP '+response.status);
      // Retrying the same payload cannot repair these account- or request-level errors.
      if(response.status===429)
        throw new GeminiTimetableError('Google Gemini đang hết hạn mức hoặc giới hạn tốc độ (429). Kiểm tra hạn mức Google AI Studio và thử lại sau.',429);
      if(response.status===401||response.status===403)
        throw new GeminiTimetableError('API key Gemini không được cấp quyền (HTTP '+response.status+'). Kiểm tra quyền dự án Google AI Studio.',502);
      if(response.status===400||response.status===413)
        throw new GeminiTimetableError('Gemini từ chối dữ liệu gửi lên (HTTP '+response.status+'). Hãy giảm kích thước hoặc kiểm tra định dạng tệp.',400);
      if(response.status===404){
        // Access to legacy models may be restricted despite the model name being valid.
        break;
      }
      if(![500,502,503,504].includes(response.status))
        throw new GeminiTimetableError('Google Gemini trả lỗi HTTP '+response.status+'.',502);
      if(attempt+1<maxAttempts)await delay(350);
    }
    if(i<models.length-1)await delay(200);
  }
  const details=errors.slice(-4).join('; ');
  throw new GeminiTimetableError(
    lastStatus===404
      ?'Các model Gemini không khả dụng với API key hiện tại ('+details+'). Hãy kiểm tra quyền truy cập model trên Google AI Studio.'
      :lastStatus===504
      ?'Gemini xử lý quá lâu; đã thử model dự phòng. Hãy thử tệp nhỏ hơn hoặc dùng chế độ đọc trên thiết bị.'
      :'Gemini chưa phản hồi sau khi thử model dự phòng ('+details+'). Hãy thử lại sau hoặc kiểm tra Google AI Studio.',
    lastStatus===504?504:503
  );
}
