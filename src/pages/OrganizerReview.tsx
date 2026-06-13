import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  FileText,
  MapPin,
  Sparkles
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useDemoState } from "../state/DemoState";
import type { AnnouncementDraft } from "../types";

export function OrganizerReview() {
  const { state, updateDraft, publish } = useDemoState();
  const [draft, setDraft] = useState<AnnouncementDraft>(state.announcement.draft);
  const navigate = useNavigate();
  const roomMatchesSource = draft.room === "B.305";

  const setField = <K extends keyof AnnouncementDraft>(
    key: K,
    value: AnnouncementDraft[K]
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const handlePublish = () => {
    updateDraft(draft);
    publish();
    navigate("/organizer/published");
  };

  return (
    <AppShell>
      <div className="page">
        <button className="back-link" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={17} /> Quay lại
        </button>
        <div className="page-heading">
          <div>
            <span className="step-label">Bước 2 / 3</span>
            <h1>Kiểm tra trước khi xuất bản</h1>
            <p>So sánh bản gốc và chỉnh những gì AI hiểu chưa đúng.</p>
          </div>
          <div className="trust-chip"><Sparkles size={16} /> AI đề xuất · Lan quyết định</div>
        </div>

        <div className="review-grid">
          <section className="panel source-panel">
            <div className="panel-title"><FileText size={18} /><strong>Nội dung gốc</strong></div>
            <p className="source-copy">{state.announcement.sourceText}</p>
            <div className="source-highlight">
              “Thuyết trình sáng thứ Bảy tại phòng <mark>B.305</mark>.”
            </div>
          </section>

          <section className="panel form-panel">
            <div className="panel-title"><Sparkles size={18} /><strong>Thẻ hành động đề xuất</strong></div>
            <label>
              <span className="field-label">Tiêu đề</span>
              <input value={draft.title} onChange={(event) => setField("title", event.target.value)} />
            </label>
            <label>
              <span className="field-label">Tóm tắt</span>
              <textarea
                rows={4}
                value={draft.summary}
                onChange={(event) => setField("summary", event.target.value)}
              />
            </label>
            <div className="field-row">
              <label>
                <span className="field-label"><CalendarClock size={15} /> Hạn chót</span>
                <input
                  type="datetime-local"
                  value={draft.deadline}
                  onChange={(event) => setField("deadline", event.target.value)}
                />
              </label>
              <label>
                <span className="field-label"><MapPin size={15} /> Phòng thuyết trình</span>
                <input
                  className={roomMatchesSource ? "valid-input" : "warning-input"}
                  value={draft.room}
                  onChange={(event) => setField("room", event.target.value)}
                />
                {!roomMatchesSource ? (
                  <small className="field-warning"><AlertTriangle size={13} /> Bản gốc ghi B.305</small>
                ) : (
                  <small className="field-valid"><CheckCircle2 size={13} /> Đã khớp bản gốc</small>
                )}
              </label>
            </div>

            <div className="review-summary">
              <CheckCircle2 size={18} />
              <div><strong>Bạn đang kiểm soát nội dung</strong><p>Thẻ chỉ được công khai sau khi bạn bấm xuất bản.</p></div>
            </div>
            <button
              className="button primary full"
              type="button"
              onClick={handlePublish}
              disabled={!roomMatchesSource || !draft.title.trim()}
            >
              <CheckCircle2 size={18} />
              Duyệt và xuất bản
            </button>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
