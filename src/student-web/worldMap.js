// 22 distinct IC3 Lesson 1 worlds, 7 encounters each. Appearance is procedural;
// level and rewards are decided only by Supabase ic3_arcade_turn.
export const WAVES_PER_WORLD=7;
export const WORLD_MAPS=[
  {
    "id": 1,
    "title": "Rừng Thạch Anh",
    "background": "/ic3-scenes/map-1.webp",
    "waves": [
      {
        "name": "Bọ Đốm Sương",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 0,
        "variant": 0
      },
      {
        "name": "Linh Miêu Sương",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 11,
        "variant": 1
      },
      {
        "name": "Bướm Dao Pha Lê",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 0,
        "variant": 2
      },
      {
        "name": "Vệ Binh Pha Lê",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 11,
        "variant": 3
      },
      {
        "name": "Golem Đá Rêu",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 0,
        "variant": 4
      },
      {
        "name": "Thú Ngà Cổ Thụ",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 11,
        "variant": 0
      },
      {
        "name": "Nhện Tinh Thể",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 0,
        "variant": 1
      }
    ]
  },
  {
    "id": 2,
    "title": "Thành Ngọc",
    "background": "/ic3-scenes/map-2.webp",
    "waves": [
      {
        "name": "Chuột Chũi Ngọc",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 7,
        "variant": 1
      },
      {
        "name": "Dơi Khảm Ngọc",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 18,
        "variant": 2
      },
      {
        "name": "Ốc Sên Lục Bảo",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 7,
        "variant": 3
      },
      {
        "name": "Kỵ Sĩ Khảm Ngọc",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 18,
        "variant": 4
      },
      {
        "name": "Kỵ Binh Thạch Giáp",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 7,
        "variant": 0
      },
      {
        "name": "Pháp Sư Ngọc Sáng",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 18,
        "variant": 1
      },
      {
        "name": "Hộ Vệ Ngọc",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 7,
        "variant": 2
      }
    ]
  },
  {
    "id": 3,
    "title": "Cồn Hổ Phách",
    "background": "/ic3-scenes/map-3.webp",
    "waves": [
      {
        "name": "Cánh Cứng Hổ Phách",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 14,
        "variant": 2
      },
      {
        "name": "Bọ Cạp Cát Lam",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 3,
        "variant": 3
      },
      {
        "name": "Cáo Hồ Phách",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 14,
        "variant": 4
      },
      {
        "name": "Tích Xà Cát Đỏ",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 3,
        "variant": 0
      },
      {
        "name": "Tượng Cát Canh Gác",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 14,
        "variant": 1
      },
      {
        "name": "Rắn Cổ Trên Đồi",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 3,
        "variant": 2
      },
      {
        "name": "Tam Xà Hổ Phách",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 14,
        "variant": 3
      }
    ]
  },
  {
    "id": 4,
    "title": "Đỉnh Tinh Vân",
    "background": "/ic3-scenes/map-4.webp",
    "waves": [
      {
        "name": "Cú Mây Vỡ",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 21,
        "variant": 3
      },
      {
        "name": "Ong Mây Sao",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 10,
        "variant": 4
      },
      {
        "name": "Dơi Lưu Tinh",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 21,
        "variant": 0
      },
      {
        "name": "Linh Thú Thiên Hà",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 10,
        "variant": 1
      },
      {
        "name": "Thiên Mã Gió Lốc",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 21,
        "variant": 2
      },
      {
        "name": "Vệ Tinh Huyễn Ảnh",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 10,
        "variant": 3
      },
      {
        "name": "Long Vương Tinh Vân",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 21,
        "variant": 4
      }
    ]
  },
  {
    "id": 5,
    "title": "Đèo Băng",
    "background": "/ic3-scenes/map-5.webp",
    "waves": [
      {
        "name": "Sóc Băng Xám",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 6,
        "variant": 4
      },
      {
        "name": "Cú Tuyết Trắng",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 17,
        "variant": 0
      },
      {
        "name": "Chim Ưng Băng",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 6,
        "variant": 1
      },
      {
        "name": "Sói Tinh Tuyết",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 17,
        "variant": 2
      },
      {
        "name": "Người Tuyết Hộ Vệ",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 6,
        "variant": 3
      },
      {
        "name": "Yêu Tinh Tuyết Xoáy",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 17,
        "variant": 4
      },
      {
        "name": "Sư Ưng Băng",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 6,
        "variant": 0
      }
    ]
  },
  {
    "id": 6,
    "title": "Lò Dung Nham",
    "background": "/ic3-scenes/map-6.webp",
    "waves": [
      {
        "name": "Tinh Linh Than Hồng",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 13,
        "variant": 0
      },
      {
        "name": "Thằn Lằn Tro",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 2,
        "variant": 1
      },
      {
        "name": "Giun Lửa Đỏ",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 13,
        "variant": 2
      },
      {
        "name": "Nhện Lửa Núi Đen",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 2,
        "variant": 3
      },
      {
        "name": "Hỏa Giáp Đá Đen",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 13,
        "variant": 4
      },
      {
        "name": "Dơi Cánh Than",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 2,
        "variant": 0
      },
      {
        "name": "Ngưu Vương Dung Nham",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 13,
        "variant": 1
      }
    ]
  },
  {
    "id": 7,
    "title": "Vườn Lục Bảo",
    "background": "/ic3-scenes/map-7.webp",
    "waves": [
      {
        "name": "Mầm Gai Hoang",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 20,
        "variant": 1
      },
      {
        "name": "Bọ Lá Biếc",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 9,
        "variant": 2
      },
      {
        "name": "Bướm Dây Leo",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 20,
        "variant": 3
      },
      {
        "name": "Hộ Vệ Dây Leo",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 9,
        "variant": 4
      },
      {
        "name": "Tê Giác Rừng Già",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 20,
        "variant": 0
      },
      {
        "name": "Rắn Dây Gai",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 9,
        "variant": 1
      },
      {
        "name": "Lan Ma Lục Bảo",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 20,
        "variant": 2
      }
    ]
  },
  {
    "id": 8,
    "title": "Rãnh Đại Dương",
    "background": "/ic3-scenes/map-8.webp",
    "waves": [
      {
        "name": "Cá Quỷ Đáy Sâu",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 5,
        "variant": 2
      },
      {
        "name": "Sứa Phát Quang",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 16,
        "variant": 3
      },
      {
        "name": "Cua Giáp San Hô",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 5,
        "variant": 4
      },
      {
        "name": "Mực Lam U Ám",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 16,
        "variant": 0
      },
      {
        "name": "Lươn Biển Sâu",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 5,
        "variant": 1
      },
      {
        "name": "Bạch Tuộc Hắc Ám",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 16,
        "variant": 2
      },
      {
        "name": "Hải Vương Vực Sâu",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 5,
        "variant": 3
      }
    ]
  },
  {
    "id": 9,
    "title": "Cung Sấm",
    "background": "/ic3-scenes/map-9.webp",
    "waves": [
      {
        "name": "Sét Con Tinh Nghịch",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 12,
        "variant": 3
      },
      {
        "name": "Hươu Điện",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 1,
        "variant": 4
      },
      {
        "name": "Vượn Lôi",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 12,
        "variant": 0
      },
      {
        "name": "Chiến Giáp Lôi Minh",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 1,
        "variant": 1
      },
      {
        "name": "Giáp Sĩ Từ Trường",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 12,
        "variant": 2
      },
      {
        "name": "Long Mã Sấm",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 1,
        "variant": 3
      },
      {
        "name": "Bọ Cạp Lôi Thạch",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 12,
        "variant": 4
      }
    ]
  },
  {
    "id": 10,
    "title": "Miệng Núi Lửa",
    "background": "/ic3-scenes/map-10.webp",
    "waves": [
      {
        "name": "Hỏa Diệm Nhí",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 19,
        "variant": 4
      },
      {
        "name": "Tiểu Quỷ Tro",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 8,
        "variant": 0
      },
      {
        "name": "Bọ Lửa Phun Trào",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 19,
        "variant": 1
      },
      {
        "name": "Đại Bàng Tro Than",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 8,
        "variant": 2
      },
      {
        "name": "Hổ Nham Thạch",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 19,
        "variant": 3
      },
      {
        "name": "Đại Bàng Nhật Diễm",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 8,
        "variant": 4
      },
      {
        "name": "Phượng Hoàng Nhật Viêm",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 19,
        "variant": 0
      }
    ]
  },
  {
    "id": 11,
    "title": "Thảo Nguyên Tuyết",
    "background": "/ic3-scenes/map-11.webp",
    "waves": [
      {
        "name": "Cáo Tuyết Bạc",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 4,
        "variant": 0
      },
      {
        "name": "Chuột Trắng Cực",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 15,
        "variant": 1
      },
      {
        "name": "Báo Băng Tuyết",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 4,
        "variant": 2
      },
      {
        "name": "Tê Giác Băng Phong",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 15,
        "variant": 3
      },
      {
        "name": "Mãnh Tượng Tuyết",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 4,
        "variant": 4
      },
      {
        "name": "Cáo Ma Bắc Cực",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 15,
        "variant": 0
      },
      {
        "name": "Ma Mút Băng Cổ",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 4,
        "variant": 1
      }
    ]
  },
  {
    "id": 12,
    "title": "Cổng Nhật Thực",
    "background": "/ic3-scenes/map-12.webp",
    "waves": [
      {
        "name": "Bóng Đen Tàn Tích",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 11,
        "variant": 1
      },
      {
        "name": "Cú Bóng Đêm",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 0,
        "variant": 2
      },
      {
        "name": "Kỵ Sĩ Cực Ảnh",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 11,
        "variant": 3
      },
      {
        "name": "Kỵ Sĩ Huyền Ảnh",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 0,
        "variant": 4
      },
      {
        "name": "Người Đá Nguyệt Thực",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 11,
        "variant": 0
      },
      {
        "name": "Rồng Con Hắc Tinh",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 0,
        "variant": 1
      },
      {
        "name": "Hắc Long Nhật Thực",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 11,
        "variant": 2
      }
    ]
  },
  {
    "id": 13,
    "title": "Đầm Đèn Lồng",
    "background": "/ic3-scenes/map-13.webp",
    "waves": [
      {
        "name": "Đom Đóm Lạc Lối",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 18,
        "variant": 2
      },
      {
        "name": "Ếch Đèn Lồng",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 7,
        "variant": 3
      },
      {
        "name": "Bướm Ánh Trăng",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 18,
        "variant": 4
      },
      {
        "name": "Lươn Sáng Kỳ Ảo",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 7,
        "variant": 0
      },
      {
        "name": "Cá Ma Đom Đóm",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 18,
        "variant": 1
      },
      {
        "name": "Thần Cây Lân Tinh",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 7,
        "variant": 2
      },
      {
        "name": "Sứa Đèn Lồng",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 18,
        "variant": 3
      }
    ]
  },
  {
    "id": 14,
    "title": "Bãi Thiên Thạch",
    "background": "/ic3-scenes/map-14.webp",
    "waves": [
      {
        "name": "Đá Sống Bất Ngờ",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 3,
        "variant": 3
      },
      {
        "name": "Bọ Đá Vũ Trụ",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 14,
        "variant": 4
      },
      {
        "name": "Thú Sắt Từ Thiên",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 3,
        "variant": 0
      },
      {
        "name": "Nhện Sao Sa",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 14,
        "variant": 1
      },
      {
        "name": "Đại Tượng Tiểu Hành Tinh",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 3,
        "variant": 2
      },
      {
        "name": "Chim Ưng Đá Sao",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 14,
        "variant": 3
      },
      {
        "name": "Ốc Sên Thiên Thạch",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 3,
        "variant": 4
      }
    ]
  },
  {
    "id": 15,
    "title": "Biển Sao",
    "background": "/ic3-scenes/map-15.webp",
    "waves": [
      {
        "name": "Cá Vây Ngân Hà",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 10,
        "variant": 4
      },
      {
        "name": "Cá Nóc Sao",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 21,
        "variant": 0
      },
      {
        "name": "Tôm Thiên Hà",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 10,
        "variant": 1
      },
      {
        "name": "Cá Mập Hư Không",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 21,
        "variant": 2
      },
      {
        "name": "Rùa Thạch San Hô",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 10,
        "variant": 3
      },
      {
        "name": "Hải Ma Lam Ngọc",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 21,
        "variant": 4
      },
      {
        "name": "Kình Ngư Sao Băng",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 10,
        "variant": 0
      }
    ]
  },
  {
    "id": 16,
    "title": "Hồ Gương",
    "background": "/ic3-scenes/map-16.webp",
    "waves": [
      {
        "name": "Linh Hồn Mặt Gương",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 17,
        "variant": 0
      },
      {
        "name": "Cáo Mặt Gương",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 6,
        "variant": 1
      },
      {
        "name": "Yêu Tinh Pha Lê",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 17,
        "variant": 2
      },
      {
        "name": "Hồ Ly Phản Chiếu",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 6,
        "variant": 3
      },
      {
        "name": "Hộ Vệ Hình Bóng",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 17,
        "variant": 4
      },
      {
        "name": "Phản Long Trong Gương",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 6,
        "variant": 0
      },
      {
        "name": "Bướm Gương",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 17,
        "variant": 1
      }
    ]
  },
  {
    "id": 17,
    "title": "Hang Pha Lê",
    "background": "/ic3-scenes/map-17.webp",
    "waves": [
      {
        "name": "Thạch Tích Lam",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 2,
        "variant": 1
      },
      {
        "name": "Dơi Thạch Nhũ",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 13,
        "variant": 2
      },
      {
        "name": "Nhện Hang Sâu",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 2,
        "variant": 3
      },
      {
        "name": "Cự Nhân Tinh Khoáng",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 13,
        "variant": 4
      },
      {
        "name": "Bọ Cánh Cứng Tinh Thể",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 2,
        "variant": 0
      },
      {
        "name": "Rùa Giáp Khoáng",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 13,
        "variant": 1
      },
      {
        "name": "Nhím Thạch Anh",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 2,
        "variant": 2
      }
    ]
  },
  {
    "id": 18,
    "title": "Xưởng Đồng Hồ",
    "background": "/ic3-scenes/map-18.webp",
    "waves": [
      {
        "name": "Bọ Máy Tích Tắc",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 9,
        "variant": 2
      },
      {
        "name": "Nhện Máy Tích Tắc",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 20,
        "variant": 3
      },
      {
        "name": "Bọ Đồng Bộ",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 9,
        "variant": 4
      },
      {
        "name": "Thợ Máy Đồng Cổ",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 20,
        "variant": 0
      },
      {
        "name": "Máy Gác Pháo Đài",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 9,
        "variant": 1
      },
      {
        "name": "Người Máy Bánh Răng",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 20,
        "variant": 2
      },
      {
        "name": "Rết Đồng Hồ",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 9,
        "variant": 3
      }
    ]
  },
  {
    "id": 19,
    "title": "Pháo Đài Cát",
    "background": "/ic3-scenes/map-19.webp",
    "waves": [
      {
        "name": "Lính Bọ Cát",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 16,
        "variant": 3
      },
      {
        "name": "Dế Cát Vàng",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 5,
        "variant": 4
      },
      {
        "name": "Tê Giác Sa Mạc",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 16,
        "variant": 0
      },
      {
        "name": "Kỵ Binh Hộ Thành",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 5,
        "variant": 1
      },
      {
        "name": "Bò Cạp Đá Trắng",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 16,
        "variant": 2
      },
      {
        "name": "Vua Bọ Cát",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 5,
        "variant": 3
      },
      {
        "name": "Cua Thành Cổ",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 16,
        "variant": 4
      }
    ]
  },
  {
    "id": 20,
    "title": "Tháp Trăng",
    "background": "/ic3-scenes/map-20.webp",
    "waves": [
      {
        "name": "Bóng Trăng Xám",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 1,
        "variant": 4
      },
      {
        "name": "Chim Nhạn Trăng",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 12,
        "variant": 0
      },
      {
        "name": "Thỏ Nguyệt Quang",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 1,
        "variant": 1
      },
      {
        "name": "Vệ Binh Nguyệt Quang",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 12,
        "variant": 2
      },
      {
        "name": "Tượng Canh Đền",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 1,
        "variant": 3
      },
      {
        "name": "Hồ Ly Nguyệt Thực",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 12,
        "variant": 4
      },
      {
        "name": "Dơi Nguyệt Thực",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 1,
        "variant": 0
      }
    ]
  },
  {
    "id": 21,
    "title": "Rạn San Hô",
    "background": "/ic3-scenes/map-21.webp",
    "waves": [
      {
        "name": "Cá Kim Màu",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 8,
        "variant": 0
      },
      {
        "name": "Cá Hề Sọc Vàng",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 19,
        "variant": 1
      },
      {
        "name": "Sứa Thủy Ngọc",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 8,
        "variant": 2
      },
      {
        "name": "Bạch Tuộc Sắc Màu",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 19,
        "variant": 3
      },
      {
        "name": "Rùa Vân San Hô",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 8,
        "variant": 4
      },
      {
        "name": "Cá Mập Cánh Sóng",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 19,
        "variant": 0
      },
      {
        "name": "Hải Mã San Hô",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 8,
        "variant": 1
      }
    ]
  },
  {
    "id": 22,
    "title": "Vịnh Cực Quang",
    "background": "/ic3-scenes/map-22.webp",
    "waves": [
      {
        "name": "Linh Thú Băng Lam",
        "tier": "Khởi động",
        "hint": "Nhận diện và ghi nhớ",
        "archetype": 15,
        "variant": 1
      },
      {
        "name": "Sói Cực Quang",
        "tier": "Thám hiểm",
        "hint": "Tìm thông tin phù hợp",
        "archetype": 4,
        "variant": 2
      },
      {
        "name": "Hươu Băng Bắc",
        "tier": "Canh gác",
        "hint": "Giải thích kiến thức",
        "archetype": 15,
        "variant": 3
      },
      {
        "name": "Rồng Con Bắc Cực",
        "tier": "Tinh anh",
        "hint": "Ứng dụng vào tình huống",
        "archetype": 4,
        "variant": 4
      },
      {
        "name": "Ưng Tinh Lục Bảo",
        "tier": "Thủ lĩnh",
        "hint": "Phân tích dữ liệu",
        "archetype": 15,
        "variant": 0
      },
      {
        "name": "Đại Thú Thiên Cực",
        "tier": "Phó tướng",
        "hint": "Kết nối các khái niệm",
        "archetype": 4,
        "variant": 1
      },
      {
        "name": "Xà Vương Cực Quang",
        "tier": "Trùm cuối",
        "hint": "Ôn tập tổng hợp",
        "archetype": 15,
        "variant": 2
      }
    ]
  }
];
export const worldAt=n=>WORLD_MAPS[Math.max(0,Math.min(21,Number(n||1)-1))];
export const waveAt=(world,wave=1)=>worldAt(world).waves[Math.max(0,Math.min(WAVES_PER_WORLD-1,Number(wave||1)-1))];
export const GEAR_CATALOG=[
 {id:0,name:"Tay trần",icon:"✊",grade:"Khởi đầu",unlock:0,description:"Tinh thần khám phá, không tăng sát thương.",damage:160},
 {id:1,name:"Găng Đồng",icon:"🥊",grade:"Phổ thông",unlock:3,description:"Gia cố nắm đấm, mỗi câu đúng tấn công mạnh hơn.",damage:178},
 {id:2,name:"Ấn Ngọc",icon:"💠",grade:"Hiếm",unlock:6,description:"Sức mạnh ngọc cổ hỗ trợ đòn đánh chính xác.",damage:196},
 {id:3,name:"Vòng Sấm",icon:"⚡",grade:"Sử thi",unlock:9,description:"Đánh thức dòng điện giữa các vì sao.",damage:214},
 {id:4,name:"Bùa Tinh Vân",icon:"🌌",grade:"Huyền thoại",unlock:12,description:"Tinh tú hội tụ trên mỗi đòn đánh.",damage:232},
 {id:5,name:"Ấn Cực Quang",icon:"✨",grade:"Thần thoại",unlock:15,description:"Đỉnh cao sức mạnh, nhận khi vượt 15 bản đồ.",damage:250}
];
