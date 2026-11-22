import React from 'react';
import './questionPhoto.css';

// Describe the evidence a sighted learner gets, without naming the answer.
const descriptions={
 m01:'Mặt dưới hình vuông có nhiều điểm tiếp xúc xếp thành hàng.',
 m02:'Một thanh mạch dài với các chân tiếp xúc và một rãnh ở cạnh.',
 m03:'Bo mạch nhỏ có chip, nhãn thông số và đầu tiếp xúc ở cạnh.',
 m04:'Bên trong vỏ kim loại có một mặt tròn sáng và cánh tay nằm sát mặt đó.',
 m05:'Bo mạch lớn có ổ cắm vuông, nhiều khe dài và các đầu nối ở cạnh.',
 m06:'Đầu cáp dẹt với hai góc vát ở cùng một phía.',
 m07:'Thiết bị cầm tay có đầu lưới tròn và dây nối.',
 m08:'Thiết bị văn phòng đang mở nắp để lộ cơ cấu bên trong.',
 m09:'Thiết bị để bàn có nắp mở và một mặt kính phẳng.',
 m10:'Các nút chữ, số và ký hiệu xếp thành nhiều hàng.',
 m11:'Một mặt hiển thị phẳng dựng trên chân đế.',
 m15:'Thiết bị di động có chân chống và bàn phím gắn phía trước.',
 m16:'Trong cửa sổ, ô được chọn chứa dãy 1, 3–5, 7.',
 m17:'Hai tệp có tên chứa cùng ngày và lần lượt các số 20-08-53, 20-02-44.',
 m18:'Nhiều vùng làm việc và cửa sổ được thu nhỏ để quan sát cùng lúc.',
 m19:'Dữ liệu được bố trí theo hàng và cột, với thanh nhập phía trên.',
 m20:'Thanh công cụ có các nút định dạng chữ và danh sách kiểu đoạn văn.',
 m21:'Phía trên nội dung trang có một ô chứa URL và một ô tìm kiếm trong trang.',
 m22:'Thiết bị nhỏ có đầu nối kim loại, trên vỏ ghi dung lượng 4 GB.'
};
export function QuestionPhoto({media}) {
  if (!Object.hasOwn(descriptions,media)) return null;
  return <img className="ic3-question-photo" src={'/ic3-media/'+media+'.webp'}
    alt={descriptions[media]} draggable={false}/>;
}
