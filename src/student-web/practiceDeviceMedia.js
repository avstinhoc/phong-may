// Real technology photographs from Wikimedia Commons, with attribution.
// Images are only shown for genuinely relevant hardware topics; never show a
// random cover slide as an illustration of a CPU/RAM/SSD question.
const PHOTO_LIBRARY={
 cpu:{file:'Cpu-processor.jpg',label:'Bộ xử lý trung tâm (CPU)',credit:'Fx Mehdi',license:'CC BY-SA 4.0'},
 ram:{file:'1gb stick of DDR SDRAM, 2014-10-31.jpg',label:'Thanh bộ nhớ RAM',credit:'Crisco 1492',license:'CC BY-SA 4.0'},
 ssd:{file:'SSD (52997087451).jpg',label:'Ổ lưu trữ SSD',credit:'Wikimedia Commons contributor',license:'CC BY 2.0'},
 microphone:{file:'USB-Microphone.jpg',label:'Micrô USB',credit:'Evan-Amos',license:'Wikimedia Commons (xem giấy phép gốc)'},
 hdmi:{file:'HDMI Cable.JPG',label:'Cáp HDMI',credit:'Fotokannan',license:'Wikimedia Commons (xem giấy phép gốc)'},
 keyboard:{file:'Computer keyboard.jpg',label:'Bàn phím máy tính',credit:'Joe lope',license:'CC BY-SA 4.0'},
 monitor:{file:'Computer monitor.jpg',label:'Màn hình LCD',credit:'Zzubnik',license:'Public domain'},
 mouse:{file:'Chuột máy tính.jpg',label:'Chuột máy tính có dây và không dây',credit:'Wikimedia Commons contributor',license:'CC BY-SA 2.0'},
 printer:{file:'Laser printer.jpg',label:'Máy in laser',credit:'Felhariri3680',license:'CC BY-SA 3.0'},
 scanner:{file:'Epson Perfection V330 Photo-7864.jpg',label:'Máy quét tài liệu',credit:'Raimond Spekking',license:'CC BY-SA 4.0'},
 laptop:{file:'Laptop PC.jpg',label:'Máy tính xách tay',credit:'Wikimedia Commons contributor',license:'CC BY-SA 4.0'},
 tablet:{file:'Tablet-Foto.jpg',label:'Máy tính bảng',credit:'JournalistOHM',license:'CC BY-SA 4.0'}
};
const BY_QUESTION={
 '1-1':'ram','1-2':'ssd','1-3':'cpu','1-4':'ram',
 '2-1':'microphone','2-2':'hdmi','2-3':'tablet','2-4':'microphone',
 '3-1':'laptop','3-2':'monitor','3-3':'tablet',
 '5-1':'printer','8-1':'scanner','10-2':'hdmi',
 'guide-1-0':'cpu','guide-1-1':'ram','guide-1-2':'ssd',
 'guide-2-0':'microphone','guide-2-1':'monitor','guide-2-2':'hdmi',
 'guide-3-0':'monitor','guide-3-1':'laptop','guide-3-2':'tablet'
};
export function devicePhotoFor(q){
 const id=String(q?.id||'');
 const key=BY_QUESTION[id]||BY_QUESTION[id.replace(/-(meaning|concept)$/,'')];
 const photo=key&&PHOTO_LIBRARY[key];
 if(!photo)return null;
 const source='https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(photo.file).replace(/%20/g,'_');
 return {
  src:'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(photo.file)+'?width=840',
  source,label:photo.label,credit:photo.credit,license:photo.license
 };
}
export const countPhotographs=()=>Object.keys(PHOTO_LIBRARY).length;
