// 22 distinct IC3 Lesson 1 worlds, 3 encounters each. Appearance is procedural;
// level and rewards are decided only by Supabase ic3_arcade_turn.
export const WAVES_PER_WORLD=3;
export const WORLD_MAPS=[
  {
    "id": 1,
    "title": "Rừng Thạch Anh",
    "background": "/ic3-scenes/map-1.webp",
    "waves": [
      {
        "name": "Bọ Đốm Sương",
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Vệ Binh Pha Lê",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Nhện Tinh Thể",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Kỵ Sĩ Khảm Ngọc",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Hộ Vệ Ngọc",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Tích Xà Cát Đỏ",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Tam Xà Hổ Phách",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Linh Thú Thiên Hà",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Long Vương Tinh Vân",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Sói Tinh Tuyết",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Sư Ưng Băng",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Nhện Lửa Núi Đen",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Ngưu Vương Dung Nham",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Hộ Vệ Dây Leo",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Lan Ma Lục Bảo",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Mực Lam U Ám",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Hải Vương Vực Sâu",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Chiến Giáp Lôi Minh",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Bọ Cạp Lôi Thạch",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Đại Bàng Tro Than",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Phượng Hoàng Nhật Viêm",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Tê Giác Băng Phong",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Ma Mút Băng Cổ",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Kỵ Sĩ Huyền Ảnh",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Hắc Long Nhật Thực",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Lươn Sáng Kỳ Ảo",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Sứa Đèn Lồng",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Nhện Sao Sa",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Ốc Sên Thiên Thạch",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Cá Mập Hư Không",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Kình Ngư Sao Băng",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Hồ Ly Phản Chiếu",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Bướm Gương",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Cự Nhân Tinh Khoáng",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Nhím Thạch Anh",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Thợ Máy Đồng Cổ",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Rết Đồng Hồ",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Kỵ Binh Hộ Thành",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Cua Thành Cổ",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Vệ Binh Nguyệt Quang",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Dơi Nguyệt Thực",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Bạch Tuộc Sắc Màu",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Hải Mã San Hô",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
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
        "tier": "Thám hiểm",
        "hint": "Khởi động kiến thức"
      },
      {
        "name": "Rồng Con Bắc Cực",
        "tier": "Tinh anh",
        "hint": "Luyện tập và vận dụng"
      },
      {
        "name": "Xà Vương Cực Quang",
        "tier": "Trùm cuối",
        "hint": "Thử thách tổng hợp"
      }
    ]
  }
];
export const worldAt=n=>WORLD_MAPS[Math.max(0,Math.min(21,Number(n||1)-1))];
export const waveAt=(world,wave=1)=>worldAt(world).waves[Math.max(0,Math.min(2,Number(wave||1)-1))];
export const GEAR_CATALOG=[
 {id:0,name:"Tay trần",icon:"✊",grade:"Khởi đầu",unlock:0,description:"Tinh thần khám phá, không tăng sát thương.",damage:160},
 {id:1,name:"Găng Đồng",icon:"🥊",grade:"Phổ thông",unlock:3,description:"Gia cố nắm đấm, mỗi câu đúng tấn công mạnh hơn.",damage:178},
 {id:2,name:"Ấn Ngọc",icon:"💠",grade:"Hiếm",unlock:6,description:"Sức mạnh ngọc cổ hỗ trợ đòn đánh chính xác.",damage:196},
 {id:3,name:"Vòng Sấm",icon:"⚡",grade:"Sử thi",unlock:9,description:"Đánh thức dòng điện giữa các vì sao.",damage:214},
 {id:4,name:"Bùa Tinh Vân",icon:"🌌",grade:"Huyền thoại",unlock:12,description:"Tinh tú hội tụ trên mỗi đòn đánh.",damage:232},
 {id:5,name:"Ấn Cực Quang",icon:"✨",grade:"Thần thoại",unlock:15,description:"Đỉnh cao sức mạnh, nhận khi vượt 15 bản đồ.",damage:250}
];
