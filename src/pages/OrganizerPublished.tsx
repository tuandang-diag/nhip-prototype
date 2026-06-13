import { Check, Clipboard, Download, ExternalLink, LayoutDashboard, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useProductState } from "../state/ProductState";
import { formatDateTime } from "../utils";
import { useParams } from "react-router-dom";

export function OrganizerPublished() {
  const { state: loadedState, invites } = useProductState();
  const state = loadedState!;
  const { groupId = "", announcementId = "" } = useParams();
  const [copied, setCopied] = useState(false);
  const shareText = `📌 ${state.announcement.draft.title}\nHạn: ${formatDateTime(state.announcement.draft.deadline)}\nMỗi thành viên dùng liên kết riêng do người tổ chức gửi.`;

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      // Clipboard may be unavailable in an embedded prototype.
    }
    setCopied(true);
  };

  const downloadInvites = () => {
    const rows = invites.map((invite) =>
      `"${invite.name.replaceAll('"', '""')}","${invite.studentId}","${window.location.origin}/member/${announcementId}?token=${invite.token}"`
    );
    const url = URL.createObjectURL(
      new Blob([`name,student_id,invite_link\n${rows.join("\n")}`], {
        type: "text/csv;charset=utf-8"
      })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nhip-announcement-invites.csv";
    anchor.click();
    URL.revokeObjectURL(url);
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
            {invites.length > 0 ? (
              <button className="button secondary full" type="button" onClick={downloadInvites}>
                <Download size={17} /> Tải liên kết riêng của thành viên
              </button>
            ) : (
              <Link className="button secondary full" to={`/organizer/groups/${groupId}/roster`}>
                Tạo lại liên kết thành viên
              </Link>
            )}
          </section>

          <section className="panel next-card">
            <span className="eyebrow">Bước tiếp theo</span>
            <h2>Theo dõi mà không làm phiền cả lớp</h2>
            <p>Dashboard cho biết ai chưa mở, ai đã xác nhận, ai hoàn thành và ai đang vướng.</p>
            <div className="next-actions">
              {invites[0] && (
                <Link className="button secondary full" to={`/member/${announcementId}?token=${invites[0].token}`}>
                  Xem thử thẻ thành viên <ExternalLink size={17} />
                </Link>
              )}
              <Link className="button primary full" to={`/organizer/groups/${groupId}/announcements/${announcementId}/dashboard`}>
                Mở dashboard <LayoutDashboard size={17} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
