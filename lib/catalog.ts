export type Product = {
  id: string;
  name: string;
  brand: string;
  pet: string;
  category: string;
  price: number;
  originalPrice: number;
  size: string;
  stock: number;
  description: string;
  image: string;
  art: number;
  badge: string;
  active: number;
};
export const pets = [
  { id: "all", name: "เพื่อนทุกตัว", en: "All friends" },
  { id: "dog", name: "น้องหมา", en: "For dogs" },
  { id: "cat", name: "น้องแมว", en: "For cats" },
  { id: "exotic", name: "สัตว์เอ็กโซติก", en: "Little & lovely" },
];
export const categories = [
  "ทั้งหมด",
  "อาหาร",
  "อาหารเสริม",
  "ยาและการป้องกัน",
  "ของใช้",
];
export const seedProducts: Product[] = [
  {
    id: "p-dog-food",
    name: "Daily Bowl อาหารสุนัขโต",
    brand: "PAWPAL NUTRITION",
    pet: "dog",
    category: "อาหาร",
    price: 590,
    originalPrice: 690,
    size: "2 กก.",
    stock: 30,
    description:
      "สินค้าตัวอย่างสำหรับทดลองระบบร้านค้า อาหารสำหรับสุนัขโต ข้อมูลส่วนประกอบและคำแนะนำการให้อาหารจริงต้องตรวจสอบจากฉลากของสินค้าที่ร้านนำมาจำหน่าย",
    image: "",
    art: 0,
    badge: "เพื่อนซี้แนะนำ",
    active: 1,
  },
  {
    id: "p-cat-food",
    name: "Happy Mew อาหารแมวโต",
    brand: "PAWPAL NUTRITION",
    pet: "cat",
    category: "อาหาร",
    price: 490,
    originalPrice: 590,
    size: "1.5 กก.",
    stock: 24,
    description:
      "สินค้าตัวอย่างสำหรับทดลองระบบร้านค้า อาหารสำหรับแมวโต ตรวจสอบช่วงวัยและปริมาณการให้อาหารจากฉลากก่อนใช้",
    image: "",
    art: 1,
    badge: "ลองสิ แล้วจะเลิฟ",
    active: 1,
  },
  {
    id: "p-omega",
    name: "Omega Care น้ำมันปลา",
    brand: "PAWPAL WELLNESS",
    pet: "dog",
    category: "อาหารเสริม",
    price: 350,
    originalPrice: 0,
    size: "60 แคปซูล",
    stock: 18,
    description:
      "สินค้าตัวอย่างสำหรับทดลองระบบร้านค้า ข้อมูลและขนาดการใช้จะระบุเมื่อร้านเพิ่มสินค้าจริง ควรปรึกษาสัตวแพทย์ก่อนเลือกอาหารเสริมให้สัตว์เลี้ยงที่มีโรคประจำตัว",
    image: "",
    art: 2,
    badge: "ดูแลในทุกวัน",
    active: 1,
  },
  {
    id: "p-rabbit-hay",
    name: "Little Garden หญ้าทิโมธี",
    brand: "PAWPAL LITTLE FRIENDS",
    pet: "exotic",
    category: "อาหาร",
    price: 220,
    originalPrice: 260,
    size: "500 กรัม",
    stock: 32,
    description:
      "สินค้าตัวอย่างสำหรับทดลองระบบร้านค้า หญ้าสำหรับกระต่ายและสัตว์ฟันแทะ กรุณาตรวจสอบชนิดสัตว์และช่วงวัยที่เหมาะสมจากฉลากจริง",
    image: "",
    art: 3,
    badge: "สำหรับเพื่อนตัวจิ๋ว",
    active: 1,
  },
  {
    id: "p-cat-omega",
    name: "Mew Care อาหารเสริมแมว",
    brand: "PAWPAL WELLNESS",
    pet: "cat",
    category: "อาหารเสริม",
    price: 320,
    originalPrice: 390,
    size: "30 แคปซูล",
    stock: 15,
    description:
      "สินค้าตัวอย่างสำหรับทดลองระบบร้านค้า โปรดให้สัตวแพทย์ตรวจสอบความเหมาะสมก่อนใช้ร่วมกับยาอื่น",
    image: "",
    art: 2,
    badge: "",
    active: 1,
  },
  {
    id: "p-protect",
    name: "ผลิตภัณฑ์ป้องกันเห็บหมัด",
    brand: "PET CARE • ตัวอย่าง",
    pet: "dog",
    category: "ยาและการป้องกัน",
    price: 450,
    originalPrice: 0,
    size: "1 กล่อง",
    stock: 0,
    description:
      "รายการตัวอย่าง ยังไม่เปิดจำหน่าย ร้านต้องเพิ่มผลิตภัณฑ์ที่ได้รับอนุญาต พร้อมชนิดสัตว์ ช่วงน้ำหนัก อายุ และข้อมูลฉลากที่ถูกต้องก่อนเปิดขาย โปรดปรึกษาสัตวแพทย์",
    image: "",
    art: 2,
    badge: "ปรึกษาก่อนเลือก",
    active: 1,
  },
];
export const money = (n: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
export type CartItem = { id: string; quantity: number };
export type ShopSettings = {
  bankName: string;
  bankAccount: string;
  bankOwner: string;
  shipping: number;
  freeShipping: number;
  demo: boolean;
  shopName: string;
  returnPolicy: string;
};
export const defaultSettings: ShopSettings = {
  bankName: "",
  bankAccount: "",
  bankOwner: "",
  shipping: 50,
  freeShipping: 990,
  demo: true,
  shopName: "PAWPAL",
  returnPolicy:
    "แจ้งสินค้าชำรุดหรือได้รับสินค้าไม่ครบผ่านแชต พร้อมเลขคำสั่งซื้อและภาพสินค้า ภายใน 7 วันหลังได้รับสินค้า",
};
export const statusLabels: Record<string, string> = {
  awaiting_payment: "รอแนบสลิป",
  reviewing: "กำลังตรวจสอบสลิป",
  paid: "ชำระเงินแล้ว",
  packing: "กำลังจัดเตรียม",
  shipped: "จัดส่งแล้ว",
  cancelled: "ยกเลิกแล้ว",
};
