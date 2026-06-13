import {
  AlertCircle,
  ArrowRight,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileText,
  HelpCircle,
  LockKeyhole,
  MapPin,
  Send,
  ShieldCheck,
  UserRoundCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { createSeedState } from "../data/seed";
import { memberApi } from "../services/backend";
import { isDemoMode } from "../services/config";
import { useProductState } from "../state/ProductState";
import type { Announcement, GroundedAnswer, Member } from "../types";
import { formatDateTime } from "../utils";

type AccessData = {
  member: Member;
  announcement: Announcement;
  group: { name: string; code: string };
  organizerName: string;
};

const mapRemote = (data: Record<string, any>): AccessData => ({
  member: {
    id: data.member.id,
    name: data.member.name,
    team: data.member.team,
    status: data.action.status,
    openedAt: data.action.opened_at,
    acknowledgedAt: data.action.acknowledged_at,
    completedAt: data.action.completed_at,
    submissionUrl: data.action.submission_url,
    blocker: data.action.blocker,
    reminders: []
  },
  announcement: {
    id: data.announcement.id,
    sourceText: data.announcement.source_text,
    reviewComplete: true,
    publishedAt: data.announcement.published_at,
    status: data.announcement.status,
    draft: {
      title: data.announcement.title,
      summary: data.announcement.summary,
      deadline: data.announcement.deadline,
      room: data.announcement.room,
      actionLabel: data.announcement.action_label,
      completionType: data.announcement.completion_type,
      attachments: (data.announcement.attachments ?? []).map(
        (attachment: Record<string, unknown>, index: number) => ({
          ...attachment,
          id: String(attachment.id ?? `attachment-${index + 1}`)
        })
      ),
      faq: (data.announcement.approved_faq ?? []).map(
        (item: Record<string, unknown>, index: number) => ({
          ...item,
          id: String(item.id ?? `faq-${index + 1}`)
        })
      )
    }
  },
  group: data.group,
  organizerName: data.organizer_name
});

export function MemberAction() {
  const { announcementId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const product = useProductState();
  const [access, setAccess] = useState<AccessData | null>(() => {
    if (!isDemoMode) return null;
    const seed = product.state ?? createSeedState();
    const demoMember =
      seed.group.members.find((candidate) => token === `demo-${candidate.id}`) ??
      seed.group.members[12];
    return {
      member: demoMember,
      announcement: seed.announcement,
      group: { name: seed.group.name, code: seed.group.code },
      organizerName: seed.group.organizer.name
    };
  });
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(!isDemoMode);
  const [submission, setSubmission] = useState("");
  const [blocker, setBlocker] = useState("");
  const [mode, setMode] = useState<"action" | "blocker">("action");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<GroundedAnswer | null>(null);
  const [rubricOpen, setRubricOpen] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);

  const reload = async () => {
    if (isDemoMode) return;
    if (!token || !announcementId) {
      setLoadError("Liên kết thiếu mã truy cập.");
      setLoading(false);
      return;
    }
    try {
      setAccess(mapRemote(await memberApi.read(token, announcementId)));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Liên kết không hợp lệ.";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [announcementId, token]);

  useEffect(() => {
    if (access) {
      setSubmission(access.member.submissionUrl);
      setBlocker(access.member.blocker);
    }
  }, [access?.member.id]);

  if (loading) return <div className="screen-message">Đang kiểm tra liên kết riêng…</div>;
  if (!access) {
    return (
      <div className="member-page">
        <div className="member-error-card">
          <AlertCircle size={32} />
          <h1>Không thể mở thẻ hành động</h1>
          <p>{loadError || "Liên kết có thể đã hết hạn, bị thu hồi hoặc thông báo chưa xuất bản."}</p>
          <span>Hãy liên hệ người tổ chức để nhận liên kết mới.</span>
        </div>
      </div>
    );
  }

  const { member, announcement, group, organizerName } = access;

  const submitWork = async () => {
    if (!submission.trim()) return;
    if (isDemoMode) {
      await product.updateMember(member.id, { status: "completed", submissionUrl: submission });
      setAccess({ ...access, member: { ...member, status: "completed", submissionUrl: submission } });
    } else {
      await memberApi.update(token, announcement.id, "submit", submission);
      await reload();
    }
  };

  const acknowledge = async () => {
    if (isDemoMode) {
      await product.updateMember(member.id, { status: "acknowledged" });
      setAccess({
        ...access,
        member: { ...member, status: "acknowledged", acknowledgedAt: new Date().toISOString() }
      });
    } else {
      await memberApi.update(token, announcement.id, "acknowledge");
      await reload();
    }
  };

  const reportBlocker = async () => {
    if (!blocker.trim()) return;
    if (isDemoMode) {
      await product.updateMember(member.id, { status: "blocked", blocker });
      setAccess({ ...access, member: { ...member, status: "blocked", blocker } });
    } else {
      await memberApi.update(token, announcement.id, "block", blocker);
      await reload();
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) return;
    if (isDemoMode) {
      const normalizedQuestion = question.toLocaleLowerCase("vi");
      const topicKeywords: Record<string, string[]> = {
        format: ["định dạng", "pdf", "powerpoint", "slide", "file"],
        permission: ["quyền xem", "mở quyền", "truy cập"],
        late: ["nộp trễ", "trễ hạn", "gia hạn", "muộn"]
      };
      const found = announcement.draft.faq.find((faq) =>
        (topicKeywords[faq.id] ?? []).some((keyword) =>
          normalizedQuestion.includes(keyword)
        )
      );
      setAnswer(found
        ? { supported: true, answer: found.answer, evidence: found.evidence ?? found.answer }
        : { supported: false, answer: "Hỏi người tổ chức", evidence: "" });
    } else {
      setAnswer(await memberApi.answer(token, announcement.id, question));
    }
  };

  return (
    <div className="member-page">
      <header className="member-header">
        <Link className="brand" to="/">
          <span className="brand-mark"><CheckCircle2 size={21} /></span><strong>Nhịp</strong>
        </Link>
        <span className="privacy-label"><LockKeyhole size={14} /> Trạng thái của bạn được giữ riêng</span>
      </header>

      <main className="member-main">
        <section className="organizer-proof">
          <span className="organizer-avatar">{organizerName.charAt(0)}</span>
          <div><span>Thông báo từ</span><strong>{organizerName} <ShieldCheck size={15} /></strong><small>{group.name} · Đã xác minh</small></div>
        </section>

        <article className="action-card">
          <div className="card-topline"><span className="pill urgent"><Clock3 size={14} /> Có hạn chót</span><span>{group.code}</span></div>
          <h1>{announcement.draft.title}</h1>
          <p className="action-summary">{announcement.draft.summary}</p>
          {member.status === "unopened" && (
            <button className="button secondary full" type="button" onClick={acknowledge}>
              <Check size={18} /> Xác nhận đã đọc
            </button>
          )}
          <div className="action-facts">
            <div><Clock3 size={18} /><span><small>Hạn chót</small><strong>{formatDateTime(announcement.draft.deadline)}</strong></span></div>
            <div><MapPin size={18} /><span><small>Địa điểm</small><strong>{announcement.draft.room || "Không áp dụng"}</strong></span></div>
          </div>
          {announcement.draft.attachments.map((attachment) => (
            <button className="attachment-card" type="button" onClick={() => setRubricOpen(true)} key={attachment.id}>
              <span><FileText size={20} /></span><div><strong>{attachment.name}</strong><small>Xem trước · Tài liệu từ người tổ chức</small></div><ExternalLink size={17} />
            </button>
          ))}

          {announcement.draft.completionType === "acknowledgement" &&
          member.status !== "unopened" ? (
            <div className="completed-state"><span><Check size={24} /></span><div><strong>Bạn đã xác nhận</strong><p>Người tổ chức đã nhận được xác nhận của bạn.</p></div></div>
          ) : member.status === "completed" ? (
            <div className="completed-state"><span><Check size={24} /></span><div><strong>Bạn đã hoàn thành</strong><p>Bạn có thể cập nhật liên kết trước hạn nếu cần.</p></div></div>
          ) : announcement.draft.completionType === "submission" ? (
            <>
              <div className="segment-control" aria-label="Chọn hành động">
                <button className={mode === "action" ? "active" : ""} onClick={() => setMode("action")}>Gửi bài</button>
                <button className={mode === "blocker" ? "active" : ""} onClick={() => setMode("blocker")}>Tôi đang vướng</button>
              </div>
              {mode === "action" ? (
                <div className="member-form">
                  <label><span className="field-label">Liên kết Google Drive của nhóm</span><input type="url" placeholder="https://drive.google.com/..." value={submission} onChange={(e) => setSubmission(e.target.value)} /></label>
                  <button className="button primary full" onClick={submitWork} disabled={!submission.trim()}><Send size={18} /> Gửi cho người tổ chức</button>
                </div>
              ) : (
                <div className="member-form">
                  <label><span className="field-label">Bạn đang cần hỗ trợ điều gì?</span><textarea rows={3} placeholder="Chỉ người tổ chức nhìn thấy" value={blocker} onChange={(e) => setBlocker(e.target.value)} /></label>
                  <button className="button warning full" onClick={reportBlocker} disabled={!blocker.trim()}><AlertCircle size={18} /> Báo riêng</button>
                </div>
              )}
            </>
          ) : null}
          <button className="calendar-button" onClick={() => setCalendarAdded(true)}>{calendarAdded ? <Check size={17} /> : <CalendarPlus size={17} />}{calendarAdded ? "Đã thêm vào việc của tôi" : "Thêm hạn chót vào việc của tôi"}</button>
        </article>

        <section className="faq-section">
          <div className="section-heading"><div><HelpCircle size={19} /><h2>Cần hỏi nhanh?</h2></div><span>Chỉ trả lời từ nội dung đã duyệt</span></div>
          <div className="suggested-questions">
            {announcement.draft.faq.slice(0, 2).map((item) => (
              <button key={item.id} onClick={() => { setQuestion(item.question); setAnswer({ supported: true, answer: item.answer, evidence: item.evidence ?? "" }); }}>{item.question}<ChevronDown size={15} /></button>
            ))}
          </div>
          <div className="question-box"><input aria-label="Câu hỏi" placeholder="Ví dụ: Có cần nộp file PowerPoint không?" value={question} onChange={(e) => setQuestion(e.target.value)} /><button className="icon-button dark" onClick={askQuestion} aria-label="Gửi câu hỏi"><ArrowRight size={18} /></button></div>
          {answer && <div className={`answer-box ${answer.supported ? "" : "unknown"}`}><UserRoundCheck size={18} /><div><p>{answer.answer}</p>{answer.evidence && <small>Bằng chứng: “{answer.evidence}”</small>}</div></div>}
        </section>
      </main>

      {rubricOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setRubricOpen(false)}>
          <section className="modal rubric-modal" role="dialog" aria-modal="true" aria-labelledby="rubric-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="pdf-preview"><span>FILE</span><h3 id="rubric-title">TÀI LIỆU ĐÍNH KÈM</h3><div className="rubric-line wide" /><div className="rubric-line" /><div className="rubric-grid"><i /><i /><i /></div></div>
            <h2>Bản xem trước mô phỏng</h2><p>Nhịp lưu metadata và liên kết, không tải tệp lên trong phiên bản này.</p><button className="button primary full" onClick={() => setRubricOpen(false)}>Đã hiểu</button>
          </section>
        </div>
      )}
    </div>
  );
}
