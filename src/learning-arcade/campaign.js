import {SECONDS} from './expeditionScore.js';
import {answerBattle} from './battleEngine.js';
const names=['Nhện Tinh Thể','Hộ Vệ Ngọc','Tam Xà Hổ Phách','Long Vương Tinh Vân','Sư Ưng Băng','Ngưu Vương Dung Nham','Lan Ma Lục Bảo','Hải Vương Vực Sâu','Bọ Cạp Lôi Thạch','Phượng Hoàng Nhật Viêm','Ma Mút Băng Cổ','Hắc Long Nhật Thực'];
export const stages=names.map((name,i)=>({name,id:'campaign-'+i,lessonId:'lv1-01',model:i+1,art:i<8?i:12+i-8,round:i+1,hp:780+145*i,damageScale:100,seconds:SECONDS,rank:'Ải '+(i+1)+' / 12'}));
export function resolveTurn(b,q,id,now,deadline){
 if(b.phase!=='question'||b.order[b.questionIndex]!==q.id)return b;
 if(now<deadline)return id==null?b:answerBattle(b,q,id);
 const n=answerBattle(b,q,q.options.find(o=>o.id!==q.correctId).id);
 return {...n,currentFeedback:{...n.currentFeedback,timedOut:true,selectedId:null},attempts:[...b.attempts,{...n.attempts.at(-1),timedOut:true,selectedId:null}]};
}
export const spellNames=['Thủy Kiếm','Nhật Luân','Trảm Nguyệt','Búa Sao Lửa','Mưa Lá','Phong Tiễn','Gai Hồng','Nỏ Đồng','Trăng Khuyết','Thủy Triều','Sao Băng','Hoa Vũ','Sư Tử Quang Trảm','Ngân Diệp Liên Tiễn','Tinh Vân Xoáy','Địa Chấn Đồng','Song Nguyệt','Thương Hải','Trống Lôi','Nhật Thương','Tơ Tinh Thể','Quyền Ngọc','Tam Nha','Long Tức','Bão Tuyết','Dung Nham','Phấn Độc','Vòi Xoáy','Song Lôi','Hỏa Dực','Băng Nha','Nhật Thực'];
