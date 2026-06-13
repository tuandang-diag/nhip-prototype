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
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDemoState } from "../state/DemoState";
import { formatDateTime } from "../utils";

const DEMO_MEMBER_ID = "member-13";

export function MemberAction() {
  const { state, updateMember } = useDemoState();
  const member = state.group.members.find((item) => item.id === DEMO_MEMBER_ID)!;
  const [submission, setSubmission] = useState(member.submissionUrl);
  const [blocker, setBlocker] = useState(member.blocker);
  const [mode, setMode] = useState<"action" | "blocker">("action");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [rubricOpen, setRubricOpen] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);

  useEffect(() => {
    if (member.status === "unopened") {
      updateMember(member.id, { status: "acknowledged" });
    }
  }, [member.id, member.status, updateMember]);

  const faqAnswer = useMemo(() => {
    const normalized = question.toLocaleLowerCase("vi");
    const topics: Record<string, string[]> = {
      format: ["định dạng", "pdf", "powerpoint", "file", "slide"],
      permission: ["quyền xem", "mở quyền", "truy cập", "permission"],
      late: ["nộp trễ", "trễ hạn", "gia hạn", "muộn"]
    };
    const match = state.announcement.draft.faq.find((item) =>
      (topics[item.id] ?? []).some((keyword) => normalized.includes(keyword))
    );
    return match?.answer ?? "";
  }, [question, state.announcement.draft.faq]);

  const askQuestion = () => {
    setAnswer(
      faqAnswer ||
        "Mình chưa tìm thấy câu trả lời trong thông báo đã duyệt. Hãy hỏi người tổ chức để tránh nhận hướng dẫn sai."
    );
  };

  const submitWork = () => {
    if (!submission.trim()) return;
    updateMember(member.id, {
      status: "completed",
      submissionUrl: submission,
      blocker: ""
    });
  };

  const reportBlocker = () => {
    if (!blocker.trim()) return;
    updateMember(member.id, { status: "blocked", blocker });
  };

  return (
    <div className="member-page">
      <header className="member-header">
        <Link className="brand" to="/">
          <span className="brand-mark"><CheckCircle2 size={21} /></span>
          <strong>Nhịp</strong>
        </Link>
        <span className="privacy-label"><LockKeyhole size={14} /> Trạng thái của bạn được giữ riêng</span>
      </header>

      <main className="member-main">
        <section className="organizer-proof">
          <span className="organizer-avatar">L</span>
          <div>
            <span>Thông báo từ</span>
            <strong>{state.group.organizer.name} <ShieldCheck size={15} /></strong>
            <small>{state.group.organizer.role} · Đã xác minh</small>
          </div>
        </section>

        <article className="action-card">
          <div className="card-topline">
            <span className="pill urgent"><Clock3 size={14} /> Còn 6 ngày</span>
            <span>{state.group.code}</span>
          </div>
          <h1>{state.announcement.draft.title}</h1>
          <p className="action-summary">{state.announcement.draft.summary}</p>

          <div className="action-facts">
            <div><Clock3 size={18} /><span><small>Hạn chót</small><strong>{formatDateTime(state.announcement.draft.deadline)}</strong></span></div>
            <div><MapPin size={18} /><span><small>Thuyết trình</small><strong>Phòng {state.announcement.draft.room}</strong></span></div>
          </div>

          <button className="attachment-card" type="button" onClick={() => setRubricOpen(true)}>
            <span><FileText size={20} /></span>
            <div><strong>Rubric thuyết trình cuối kỳ.pdf</strong><small>Xem trước · Tài liệu từ người tổ chức</small></div>
            <ExternalLink size={17} />
          </button>

          {member.status === "completed" ? (
            <div className="completed-state">
              <span><Check size={24} /></span>
              <div><strong>Bạn đã hoàn thành</strong><p>Liên kết đã được gửi cho Lan. Bạn vẫn có thể cập nhật trước hạn.</p></div>
            </div>
          ) : (
            <>
              <div className="segment-control" aria-label="Chọn hành động">
                <button className={mode === "action" ? "active" : ""} onClick={() => setMode("action")}>
                  Gửi bài
                </button>
                <button className={mode === "blocker" ? "active" : ""} onClick={() => setMode("blocker")}>
                  Tôi đang vướng
                </button>
              </div>
              {mode === "action" ? (
                <div className="member-form">
                  <label>
                    <span className="field-label">Liên kết Google Drive của nhóm</span>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={submission}
                      onChange={(event) => setSubmission(event.target.value)}
                    />
                  </label>
                  <button className="button primary full" type="button" onClick={submitWork} disabled={!submission.trim()}>
                    <Send size={18} /> Gửi bài cho Lan
                  </button>
                </div>
              ) : (
                <div className="member-form">
                  <label>
                    <span className="field-label">Bạn đang cần hỗ trợ điều gì?</span>
                    <textarea
                      rows={3}
                      placeholder="Chỉ Lan nhìn thấy nội dung này"
                      value={blocker}
                      onChange={(event) => setBlocker(event.target.value)}
                    />
                  </label>
                  <button className="button warning full" type="button" onClick={reportBlocker} disabled={!blocker.trim()}>
                    <AlertCircle size={18} /> Báo riêng cho Lan
                  </button>
                </div>
              )}
            </>
          )}

          <button className="calendar-button" type="button" onClick={() => setCalendarAdded(true)}>
            {calendarAdded ? <Check size={17} /> : <CalendarPlus size={17} />}
            {calendarAdded ? "Đã thêm vào việc của tôi" : "Thêm hạn chót vào việc của tôi"}
          </button>
        </article>

        <section className="faq-section">
          <div className="section-heading">
            <div><HelpCircle size={19} /><h2>Cần hỏi nhanh?</h2></div>
            <span>Chỉ trả lời từ thông báo đã duyệt</span>
          </div>
          <div className="suggested-questions">
            {state.announcement.draft.faq.slice(0, 2).map((item) => (
              <button key={item.id} type="button" onClick={() => { setQuestion(item.question); setAnswer(item.answer); }}>
                {item.question}<ChevronDown size={15} />
              </button>
            ))}
          </div>
          <div className="question-box">
            <input
              aria-label="Câu hỏi"
              placeholder="Ví dụ: Có cần nộp file PowerPoint không?"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button className="icon-button dark" type="button" onClick={askQuestion} aria-label="Gửi câu hỏi">
              <ArrowRight size={18} />
            </button>
          </div>
          {answer && (
            <div className={`answer-box ${faqAnswer ? "" : "unknown"}`}>
              <UserRoundCheck size={18} />
              <p>{answer}</p>
            </div>
          )}
        </section>
      </main>

      {rubricOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setRubricOpen(false)}>
          <section
            className="modal rubric-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rubric-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="pdf-preview">
              <span>PDF</span>
              <h3 id="rubric-title">RUBRIC THUYẾT TRÌNH CUỐI KỲ</h3>
              <div className="rubric-line wide" /><div className="rubric-line" /><div className="rubric-grid"><i /><i /><i /></div>
            </div>
            <h2>Rubric thuyết trình cuối kỳ</h2>
            <p>Bản xem trước mô phỏng. Tệp thực tế không được tải lên trong prototype.</p>
            <button className="button primary full" type="button" onClick={() => setRubricOpen(false)}>Đã hiểu</button>
          </section>
        </div>
      )}
    </div>
  );
}
