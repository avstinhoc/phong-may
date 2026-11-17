// Replace only the *existing* top-left logo image inside Google's native XLSX export.
// Editing the zip media entry (rather than loading/rebuilding the workbook with ExcelJS)
// preserves its formula XML, merged cells, styles, checkbox conversion and geometry.
let jsZipPromise=null;
async function jsZipLibrary(){
 if(window.JSZip)return window.JSZip;
 if(jsZipPromise)return jsZipPromise;
 const sources=[
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
 ];
 jsZipPromise=(async()=>{
  for(const src of sources){
   try{
    await new Promise((resolve,reject)=>{
     const s=document.createElement('script');s.src=src;s.async=true;
     s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
    if(window.JSZip)return window.JSZip;
   }catch{}
  }
  throw Error('Không tải được bộ thay logo Excel; hãy thử lại khi có mạng.');
 })();
 return jsZipPromise;
}
export function detectTopLeftLogoTarget(drawingXML,relsXML){
 const anchors=String(drawingXML||'').match(/<xdr:(?:oneCellAnchor|twoCellAnchor)>[\s\S]*?<\/xdr:(?:oneCellAnchor|twoCellAnchor)>/g)||[];
 for(const a of anchors){
  const from=a.match(/<xdr:from>([\s\S]*?)<\/xdr:from>/)?.[1]||'';
  if(!/<xdr:col>0<\/xdr:col>/.test(from)||!/<xdr:row>0<\/xdr:row>/.test(from))continue;
  const imageId=a.match(/r:embed="([^"]+)"/)?.[1];
  if(!imageId)continue;
  const candidates=String(relsXML||'').match(/<Relationship\s[^>]*>/g)||[];
  for(const rel of candidates){
   const id=rel.match(/\bId="([^"]+)"/)?.[1];
   if(id!==imageId)continue;
   const name=rel.match(/\bTarget="\.\.\/media\/([A-Za-z0-9_.-]+\.png)"/i)?.[1];
   if(name)return 'xl/media/'+name;
  }
 }
 return null;
}
function imageToPng(logo){
 return new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>{
   if(!img.naturalWidth||!img.naturalHeight){reject(Error('Logo rỗng.'));return;}
   const canvas=document.createElement('canvas');canvas.width=308;canvas.height=164;
   const ctx=canvas.getContext('2d');if(!ctx){reject(Error('Không tạo được ảnh.'));return;}
   ctx.clearRect(0,0,308,164);
   const scale=Math.min(308/img.naturalWidth,164/img.naturalHeight);
   const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
   ctx.drawImage(img,(308-w)/2,(164-h)/2,w,h);
   canvas.toBlob(async blob=>{
    if(!blob){reject(Error('Không xuất được logo PNG.'));return;}
    resolve(new Uint8Array(await blob.arrayBuffer()));
   },'image/png');
  };
  img.onerror=()=>reject(Error('Không thể đọc logo đã chọn.'));
  img.src=logo;
 });
}
export async function replaceExistingTopLeftLogo(workbookBlob,logo){
 if(!logo||!/^data:image\/(?:png|jpeg|webp);base64,/.test(logo))
   throw Error('Vui lòng chọn logo PNG, JPG hoặc WebP trước khi xuất.');
 const JSZip=await jsZipLibrary();
 const zip=await JSZip.loadAsync(await workbookBlob.arrayBuffer());
 const logoBytes=await imageToPng(logo);
 let count=0;
 const drawings=Object.keys(zip.files).filter(name=>/^xl\/drawings\/drawing\d+\.xml$/.test(name));
 for(const name of drawings){
  const draw=await zip.file(name).async('string');
  const relName=name.replace('xl/drawings/','xl/drawings/_rels/')+'.rels';
  const relFile=zip.file(relName);
  if(!relFile)continue;
  const rel=await relFile.async('string');
  const media=detectTopLeftLogoTarget(draw,rel);
  if(media&&zip.file(media)){
   zip.file(media,logoBytes,{binary:true});
   count++;
  }
 }
 if(!count)throw Error('File gốc chưa có ảnh logo nằm ở góc A1. Hãy chèn một logo vào Google Sheets trước rồi thử lại.');
 return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6},
  mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
