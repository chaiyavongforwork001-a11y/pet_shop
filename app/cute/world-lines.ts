// Thai copy for the 3D island. Index 0 = corgi, 1 = cat, 2 = bunny.
import type { Phase } from "./world-sky";

export type Trio = readonly [string, string, string];

/** Signature trick bubbles. */
export const trickLine: Trio = ["โฮ่ง! โฮ่ง!", "เมี้ยว~ ครืด ๆ ♡", "งั่ม ๆ แครอท!"];

/** Shown when a pet has been petted enough. */
export const petLine: Trio = ["ชอบจังเลย ♡", "ครืดดด~", "ฟุดฟิด ♡"];

/** Reaction to pawpal:cart-added. */
export const cheerLine: Trio = [
  "ของอร่อยมาแล้ว!",
  "ของฉันเหรอ? ♡",
  "ขอบคุณน้า ♡",
];

/** Reaction to the hero shop buttons (peek prop), once per pet per session. */
export const peekLine: Trio = ["ของฉันเหรอ?!", "เลือกของดี ๆ นะ", "มีแครอทไหม?"];

/** Reaction to pawpal:secret. */
export const secretLine: Trio = [
  "เจอความลับแล้ว!",
  "แอบดูอยู่นะ ♡",
  "ว้าว! เซอร์ไพรส์",
];

/** Live-region labels for user tricks. */
export const trickLabel: Trio = [
  "น้องหมาหมุนตัวดีใจ",
  "น้องแมวบิดขี้เกียจ",
  "น้องกระต่ายกระโดดกินแครอท",
];

/** Live-region labels for the petting milestone. */
export const petLabel: Trio = [
  "น้องหมาชอบให้ลูบหัว",
  "น้องแมวครางครืด ๆ อย่างมีความสุข",
  "น้องกระต่ายฟุดฟิดดีใจ",
];

/** Idle chatter, picked at random (never the same line twice in a row). */
export const idleLine: readonly string[] = [
  "วันนี้อากาศดีจัง",
  "หิวขนมแล้วน้า",
  "มาเล่นกันไหม?",
  "ลูบหัวหน่อยสิ~",
  "ใครเห็นบอลฉันบ้าง?",
];

/** Daypart greeting, once per session. */
export const daypartLine: Record<Phase, string> = {
  morning: "อรุณสวัสดิ์! รอข้าวเช้าอยู่นะ",
  day: "เที่ยงแล้ว ได้เวลาของอร่อย",
  golden: "เย็นนี้ไปเดินเล่นกันไหม?",
  night: "ดึกแล้ว ง่วงนอนจัง…",
};

/** Wins over daypartLine on Saturday and Sunday, 10:00-18:00. */
export const weekendLine = "วันหยุดนี้อยู่ด้วยกันทั้งวันนะ ♡";

/** The greet chorus announces once, for all three pets. */
export const greetLabel = "เพื่อน ๆ โชว์ท่าทักทายพร้อมกัน";

export const toyLine = "เด้งดึ๋ง!";
export const toyLabel = "ลูกบอลเด้งดึ๋ง";

/** Welcome-back party after shopping away from the hero. */
export const partyLine = "ขอบคุณที่ช้อปให้นะ ♡";

/** peek = 'all' (the main shop button), once per session. */
export const shopAllLine = "ไปช้อปกัน!";

export const photoLine = "แชะ!";
export const photoLabel = "ถ่ายรูปคู่เพื่อนซี้แล้ว";

/** Photo countdown, shown with the 'count' emote variant. */
export const countLine: Trio = ["3", "2", "1"];

/** Shown when a pet is tapped again during its trick cooldown. */
export const alertLine = "!";
