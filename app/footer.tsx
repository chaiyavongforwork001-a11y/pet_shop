"use client";
import { ArrowUpRight, Heart, PawPrint, Sparkles } from "lucide-react";
import { Brand } from "./ui";
import { pets } from "../lib/catalog";
import { CuteAmbient } from "./cute/core-ambient";
import { CoreBalloonTop } from "./cute/core-balloon";
import { CoreMotionToggle } from "./cute/core-motion-toggle";

export function PetFooter({
  shop,
  orders,
  info,
  chat,
  pet,
}: {
  shop: (pet?: string) => void;
  orders: () => void;
  info: (title: string) => void;
  chat: () => void;
  pet?: string;
}) {
  return (
    <footer className="pet-footer">
      <div className="wrap">
        <div className="footer-playground">
          <div className="footer-invitation">
            <span className="footer-love">
              <Heart size={16} fill="currentColor" /> ด้วยรัก จาก PAWPAL
            </span>
            <h2>
              ไว้เจอกันใหม่นะ
              <br />
              <em>เพื่อนซี้!</em>
            </h2>
            <p>
              ของอร่อยและความสุขเล็ก ๆ<br />
              รอเพื่อนของคุณอยู่ตรงนี้เสมอ
            </p>
            <button className="footer-shop" onClick={() => shop()}>
              <PawPrint size={19} /> ช้อปให้เพื่อนซี้ <ArrowUpRight size={21} />
            </button>
          </div>
          <div className="footer-friends" aria-label="ช้อปตามสัตว์เลี้ยง">
            <Sparkles className="footer-spark" aria-hidden="true" />
            <div className="footer-paw-trail" aria-hidden="true">
              <PawPrint />
              <PawPrint />
              <PawPrint />
            </div>
            {pets.slice(1).map((pet) => (
              <button
                className={`footer-friend friend-${pet.id}`}
                key={pet.id}
                onClick={() => shop(pet.id)}
              >
                <span className="friend-portrait">
                  <img
                    src={`/images/pet-${pet.id}.webp`}
                    alt=""
                    loading="lazy"
                  />
                </span>
                <span className="friend-label">
                  {pet.name}
                  <ArrowUpRight size={16} />
                </span>
              </button>
            ))}
            <span className="footer-hug" aria-hidden="true">
              <Heart fill="currentColor" />
            </span>
          </div>
        </div>
        <div className="footer-links">
          <div className="footer-brand-block">
            <Brand />
            <p>ทุกความสุขของเพื่อนตัวเล็ก</p>
            <span>
              <PawPrint size={16} /> หมา · แมว · เอ็กโซติก
            </span>
          </div>
          <nav aria-label="บริการลูกค้า">
            <h3>ให้เราช่วยดูแล</h3>
            <button onClick={orders}>
              คำสั่งซื้อของฉัน <ArrowUpRight size={16} />
            </button>
            <button onClick={() => info("การจัดส่ง")}>
              การจัดส่งและการคืนสินค้า <ArrowUpRight size={16} />
            </button>
            <button onClick={chat}>
              คุยกับทีม PAWPAL <ArrowUpRight size={16} />
            </button>
          </nav>
          <div className="footer-care-note">
            <span>
              <Heart size={18} /> ใส่ใจเพื่อนทุกตัว
            </span>
            <p>
              เลือกให้เหมาะกับชนิดและช่วงวัย
              <br />
              เพราะเพื่อนทุกตัวแตกต่างกัน
            </p>
            <a href="/admin">
              สำหรับแอดมิน <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
        <div className="footer-fineprint">
          <span>© {new Date().getFullYear()} PAWPAL</span>
          <CoreBalloonTop />
          <button onClick={() => info("ความเป็นส่วนตัว")}>
            นโยบายความเป็นส่วนตัว
          </button>
          <CoreMotionToggle />
          <span className="cc-psst">psst… ลองพิมพ์ meow ดูสิ</span>
          <span>TH / ฿ THB</span>
        </div>
      </div>
      <CuteAmbient pet={pet ?? "all"} />
    </footer>
  );
}
