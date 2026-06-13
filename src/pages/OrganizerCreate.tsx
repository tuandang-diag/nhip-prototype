import { ArrowRight, Check, FileText, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useDemoState } from "../state/DemoState";

export function OrganizerCreate() {
  const { state } = useDemoState();
  const [source, setSource] = useState(state.announcement.sourceText);
  const [generated, setGenerated] = useState(false);
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="page">
        <div className="page-heading">
          <div>
            <span className="step-label">Bước 1 / 3</span>
            <h1>Biến tin nhắn thành việc rõ ràng</h1>
            <p>Dán nguyên văn thông báo. Nhịp sẽ đề xuất cấu trúc để bạn kiểm tra.</p>
          </div>
          <div className="trust-chip"><Check size={16} /> AI không tự xuất bản</div>
        </div>

        <div className="create-grid">
          <section className="panel compose-panel">
            <label htmlFor="source-announcement">
              <span className="field-label">Thông báo gốc từ Zalo / Messenger</span>
              <textarea
                id="source-announcement"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                rows={11}
              />
            </label>
            <div className="compose-meta">
              <span>{source.length} ký tự</span>
              <span>Không gửi lại vào nhóm chat</span>
            </div>
            <button
              className="button primary full"
              type="button"
              disabled={!source.trim()}
              onClick={() => setGenerated(true)}
            >
              <Sparkles size={18} />
              Tạo bản nháp bằng AI
            </button>
          </section>

          <aside className={`panel ai-preview ${generated ? "generated" : ""}`}>
            {!generated ? (
              <div className="empty-state">
                <span className="empty-icon"><FileText size={28} /></span>
                <h2>Bản nháp sẽ xuất hiện ở đây</h2>
                <p>AI chỉ tách nội dung đã có, không tự thêm chính sách hoặc yêu cầu mới.</p>
              </div>
            ) : (
              <>
                <div className="ai-heading">
                  <span className="spark-icon"><Sparkles size={18} /></span>
                  <div><strong>Đã tìm thấy 6 trường</strong><small>Cần bạn kiểm tra 1 chi tiết</small></div>
                </div>
                <div className="preview-list">
                  <div><span>Tiêu đề</span><strong>{state.announcement.draft.title}</strong></div>
                  <div><span>Hạn chót</span><strong>23:59 · 19/06/2026</strong></div>
                  <div className="warning-row"><span>Phòng học</span><strong>B.503 · Có thể sai</strong></div>
                  <div><span>Hình thức</span><strong>Gửi liên kết nhóm</strong></div>
                </div>
                <button
                  className="button primary full"
                  type="button"
                  onClick={() => navigate("/organizer/review")}
                >
                  Kiểm tra bản nháp
                  <ArrowRight size={18} />
                </button>
              </>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
