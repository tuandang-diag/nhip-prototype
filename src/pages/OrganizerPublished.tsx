import { Check, Clipboard, ExternalLink, LayoutDashboard, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useDemoState } from "../state/DemoState";
import { formatDateTime } from "../utils";

export function OrganizerPublished() {
  const { state } = useDemoState();
  const [copied, setCopied] = useState(false);
  const shareText = `📌 ${state.announcement.draft.title}\nHạn: ${formatDateTime(state.announcement.draft.deadline)}\nXem và hoàn thành tại: ${window.location.origin}/member`;

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      // Clipboard may be unavailable in an embedded prototype.
    }
    setCopied(true);
  };

  return (
    <AppShell>
      <div className="page narrow-page">
        <section className="success-hero">
          <span className="success-icon"><Check size={34} /></span>
          <span className="pill success">Đã xuất bản</span>
          <h1>Thông báo đã sẵn sàng để chia sẻ</h1>
          <p>Thành viên mở trực tiếp trên điện thoại, không cần cài ứng dụng.</p>
        </section>

        <div className="published-grid">
          <section className="panel share-card">
            <div className="share-app"><MessageCircle size={19} /><strong>Tin nhắn chia sẻ vào Zalo</strong></div>
            <pre>{shareText}</pre>
            <button className="button primary full" type="button" onClick={copyShare}>
              {copied ? <Check size={18} /> : <Clipboard size={18} />}
              {copied ? "Đã sao chép" : "Sao chép tin nhắn"}
            </button>
          </section>

          <section className="panel next-card">
            <span className="eyebrow">Bước tiếp theo</span>
            <h2>Theo dõi mà không làm phiền cả lớp</h2>
            <p>Dashboard cho biết ai chưa mở, ai đã xác nhận, ai hoàn thành và ai đang vướng.</p>
            <div className="next-actions">
              <Link className="button secondary full" to="/member">
                Xem thẻ thành viên <ExternalLink size={17} />
              </Link>
              <Link className="button primary full" to="/organizer/dashboard">
                Mở dashboard <LayoutDashboard size={17} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
