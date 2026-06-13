import { ArrowRight, Check, FileText, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useProductState } from "../state/ProductState";

export function OrganizerCreate() {
  const { state, generateDraft, status, error } = useProductState();
  const [source, setSource] = useState("");
  const [generated, setGenerated] = useState<Awaited<
    ReturnType<typeof generateDraft>
  > | null>(null);
  const navigate = useNavigate();
  const { groupId = "" } = useParams();

  const handleGenerate = async () => {
    const announcement = await generateDraft(source);
    setGenerated(announcement);
  };

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
              onClick={handleGenerate}
            >
              <Sparkles size={18} />
              {status === "loading" ? "AI đang phân tích…" : "Tạo bản nháp bằng AI"}
            </button>
            {error && <div className="error-banner">{error}</div>}
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
                  <div><span>Tiêu đề</span><strong>{generated.draft.title}</strong></div>
                  <div><span>Hạn chót</span><strong>{generated.draft.deadline || "Cần bổ sung"}</strong></div>
                  <div className={generated.aiWarnings?.length ? "warning-row" : ""}><span>Phòng học</span><strong>{generated.draft.room || "Cần bổ sung"}</strong></div>
                  <div><span>Hình thức</span><strong>{generated.draft.actionLabel}</strong></div>
                </div>
                <button
                  className="button primary full"
                  type="button"
                  onClick={() =>
                    navigate(
                      `/organizer/groups/${groupId}/announcements/${generated.id}/review`
                    )
                  }
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
