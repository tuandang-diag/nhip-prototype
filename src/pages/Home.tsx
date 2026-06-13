import { ArrowRight, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="landing">
      <div className="landing-blob blob-one" />
      <div className="landing-blob blob-two" />
      <header className="landing-header">
        <div className="brand">
          <span className="brand-mark"><Sparkles size={22} /></span>
          <strong>Nhịp</strong>
        </div>
        <Link className="button ghost" to="/organizer/create">Vào bản demo</Link>
      </header>

      <section className="hero">
        <span className="pill">Dành cho lớp học và câu lạc bộ</span>
        <h1>Thông báo đã xem.<br /><em>Việc đã rõ chưa?</em></h1>
        <p>
          Nhịp biến một tin nhắn dài trong Zalo thành hành động rõ ràng,
          theo dõi riêng tư và nhắc đúng người.
        </p>
        <div className="hero-actions">
          <Link className="button primary large" to="/organizer/create">
            Bắt đầu với vai trò tổ chức
            <ArrowRight size={19} />
          </Link>
          <Link className="button secondary large" to="/member">
            Xem như thành viên
          </Link>
        </div>
      </section>

      <section className="feature-strip" aria-label="Lợi ích chính">
        <article>
          <span><MessageSquareText size={22} /></span>
          <div><strong>Không thay thế Zalo</strong><p>Chia sẻ một liên kết, giữ nguyên nhóm chat.</p></div>
        </article>
        <article>
          <span><Sparkles size={22} /></span>
          <div><strong>AI có người duyệt</strong><p>Lan kiểm tra mọi nội dung trước khi xuất bản.</p></div>
        </article>
        <article>
          <span><ShieldCheck size={22} /></span>
          <div><strong>Trạng thái riêng tư</strong><p>Không bảng xếp hạng, không bêu tên công khai.</p></div>
        </article>
      </section>
    </div>
  );
}
