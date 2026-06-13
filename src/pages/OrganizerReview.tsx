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
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useProductState } from "../state/ProductState";
import type { AnnouncementDraft } from "../types";

export function OrganizerReview() {
  const { state, publish, status, error } = useProductState();
  const [draft, setDraft] = useState<AnnouncementDraft>(state!.announcement.draft);
  const navigate = useNavigate();
  const { groupId = "", announcementId = "" } = useParams();
  const isValid = Boolean(draft.title.trim() && draft.summary.trim() && draft.deadline);

  const setField = <K extends keyof AnnouncementDraft>(
    key: K,
    value: AnnouncementDraft[K]
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const handlePublish = async () => {
    await publish(draft);
    navigate(`/organizer/groups/${groupId}/announcements/${announcementId}/published`);
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
          <div className="trust-chip"><Sparkles size={16} /> AI đề xuất · Bạn quyết định</div>
        </div>

        <div className="review-grid">
          <section className="panel source-panel">
            <div className="panel-title"><FileText size={18} /><strong>Nội dung gốc</strong></div>
            <p className="source-copy">{state!.announcement.sourceText}</p>
            {state!.announcement.aiEvidence?.slice(0, 3).map((item) => (
              <div className="source-highlight" key={`${item.field}-${item.quote}`}>
                <strong>{item.field}:</strong> “<mark>{item.quote}</mark>”
              </div>
            ))}
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
                  value={draft.room}
                  onChange={(event) => setField("room", event.target.value)}
                />
                {state!.announcement.aiWarnings?.length ? (
                  <small className="field-warning"><AlertTriangle size={13} /> Kiểm tra lại với bản gốc</small>
                ) : <small className="field-valid"><CheckCircle2 size={13} /> AI không phát hiện mâu thuẫn</small>}
              </label>
            </div>

            <div className="review-summary">
              <CheckCircle2 size={18} />
              <div><strong>Bạn đang kiểm soát nội dung</strong><p>Thẻ chỉ được công khai sau khi bạn bấm xuất bản.</p></div>
            </div>
            {state!.announcement.aiWarnings?.map((warning) => (
              <div className="error-banner" key={warning}>{warning}</div>
            ))}
            {error && <div className="error-banner">{error}</div>}
            <button
              className="button primary full"
              type="button"
              onClick={handlePublish}
              disabled={!isValid || status === "loading"}
            >
              <CheckCircle2 size={18} />
              {status === "loading" ? "Đang xuất bản…" : "Duyệt và xuất bản"}
            </button>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
