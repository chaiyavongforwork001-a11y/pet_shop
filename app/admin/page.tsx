import { getChatGPTUser, chatGPTSignInPath } from "../chatgpt-auth";
import { isAdmin } from "../../lib/server";
import Admin from "./panel";
import { Brand } from "../ui";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const u = await getChatGPTUser();
  if (!u || !(await isAdmin()))
    return (
      <main className="admin-access">
        <Brand />
        <div className="access-card">
          <h1>พื้นที่ดูแลร้าน PAWPAL</h1>
          <p>
            {u
              ? "บัญชีนี้ยังไม่ได้รับสิทธิ์แอดมิน เจ้าของร้านต้องกำหนดอีเมลแอดมินก่อนเริ่มใช้งาน"
              : "ลงชื่อเข้าใช้ด้วยบัญชีแอดมินเพื่อจัดการสินค้า คำสั่งซื้อ และแชต"}
          </p>
          {!u && (
            <a
              className="primary-button"
              href={chatGPTSignInPath("/admin")}
              target="_top"
            >
              ลงชื่อเข้าใช้ด้วย ChatGPT
            </a>
          )}
          <a className="text-button" href="/">
            กลับไปหน้าร้าน →
          </a>
        </div>
      </main>
    );
  return <Admin name={u.displayName} />;
}
