// Authentic component function matches sourced to supplied Lesson 1 slides 4, 6 and 11.
// This is a click-to-match concept exercise, NOT a physical PC assembly guide.
export const HARDWARE_SLOTS=[
 {id:'processing',expected:'cpu',label:'Khu xử lý',hint:'Thiết bị xử lý dữ liệu và thực thi lệnh.',explanation:'CPU thực thi lệnh và xử lý dữ liệu (Bài 1, slide 4).'},
 {id:'working-memory',expected:'ram',label:'Khu bộ nhớ tạm',hint:'Lưu dữ liệu tạm thời khi chương trình đang chạy.',explanation:'RAM là bộ nhớ khả biến và mất dữ liệu khi tắt nguồn (Bài 1, slide 6).'},
 {id:'storage',expected:'ssd',label:'Khu lưu trữ',hint:'Lưu dữ liệu dài hạn nhờ các chip Flash.',explanation:'SSD dùng bộ nhớ Flash để lưu dữ liệu (Bài 1, slide 11).'},
 {id:'graphics',expected:'gpu',label:'Khu xử lý đồ họa',hint:'Thiết bị xử lý đồ họa của máy tính.',explanation:'GPU (card đồ họa) là thiết bị xử lý (Bài 1, slide 4).'}
];
export const HARDWARE_PARTS=[
 {id:'cpu',label:'CPU',symbol:'⚙️'},
 {id:'ram',label:'RAM',symbol:'▰'},
 {id:'ssd',label:'SSD',symbol:'💾'},
 {id:'gpu',label:'GPU',symbol:'🎮'}
];
export const evaluateHardwareChoice=(slotId,partId)=>
 HARDWARE_SLOTS.find(x=>x.id===slotId)?.expected===partId;
