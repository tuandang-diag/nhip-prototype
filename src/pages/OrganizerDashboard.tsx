import {
  BellRing,
  Check,
  Clipboard,
  Download,
  Filter,
  MessageSquareWarning,
  Search,
  Send,
  Users
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/StatusBadge";
import { useDemoState } from "../state/DemoState";
import type { MemberStatus } from "../types";
import { canRemind, formatDateTime, statusLabels, toCsv } from "../utils";

type FilterValue = "all" | MemberStatus;

const statusOrder: MemberStatus[] = ["unopened", "acknowledged", "completed", "blocked"];

export function OrganizerDashboard() {
  const { state, sendReminders } = useDemoState();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [query, setQuery] = useState("");
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  const counts = useMemo(
    () =>
      statusOrder.reduce(
        (result, status) => ({
          ...result,
          [status]: state.group.members.filter((member) => member.status === status).length
        }),
        {} as Record<MemberStatus, number>
      ),
    [state.group.members]
  );

  const filtered = state.group.members.filter((member) => {
    const matchesFilter = filter === "all" || member.status === filter;
    const normalized = query.trim().toLocaleLowerCase("vi");
    return (
      matchesFilter &&
      (!normalized ||
        member.name.toLocaleLowerCase("vi").includes(normalized) ||
        member.team.toLocaleLowerCase("vi").includes(normalized))
    );
  });

  const reminderTargets = state.group.members.filter(
    (member) => member.status !== "completed" && canRemind(member)
  );

  const handleExport = () => {
    const blob = new Blob([toCsv(state.group.members)], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nhip-trang-thai-lop.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReminder = () => {
    sendReminders(reminderTargets.map((member) => member.id));
    setReminderSent(true);
  };

  return (
    <AppShell>
      <div className="page dashboard-page">
        <div className="page-heading">
          <div>
            <span className="step-label">Tổng quan lớp</span>
            <h1>{state.announcement.draft.title}</h1>
            <p>
              Hạn {formatDateTime(state.announcement.draft.deadline)} · Phòng{" "}
              {state.announcement.draft.room}
            </p>
          </div>
          <div className="heading-actions">
            <button className="button secondary" type="button" onClick={handleExport}>
              <Download size={17} /> Xuất CSV
            </button>
            <button className="button primary" type="button" onClick={() => setReminderOpen(true)}>
              <BellRing size={17} /> Nhắc người chưa xong
            </button>
          </div>
        </div>

        <section className="stats-grid" aria-label="Thống kê trạng thái">
          {statusOrder.map((status) => (
            <button
              key={status}
              type="button"
              className={`stat-card stat-${status} ${filter === status ? "selected" : ""}`}
              onClick={() => setFilter(status)}
            >
              <span>{statusLabels[status]}</span>
              <strong>{counts[status]}</strong>
              <small>{Math.round((counts[status] / state.group.members.length) * 100)}% lớp</small>
            </button>
          ))}
        </section>

        <div className="dashboard-grid">
          <section className="panel members-panel">
            <div className="table-toolbar">
              <div>
                <h2>Trạng thái thành viên</h2>
                <p>Chỉ người tổ chức nhìn thấy danh sách này.</p>
              </div>
              <div className="toolbar-controls">
                <label className="search-field">
                  <Search size={16} />
                  <span className="sr-only">Tìm thành viên</span>
                  <input
                    placeholder="Tìm tên hoặc nhóm"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <button
                  className={`button icon-text ${filter !== "all" ? "active-filter" : ""}`}
                  type="button"
                  onClick={() => setFilter("all")}
                >
                  <Filter size={16} /> Tất cả
                </button>
              </div>
            </div>

            <div className="member-table-wrap">
              <table className="member-table">
                <thead>
                  <tr>
                    <th>Thành viên</th>
                    <th>Nhóm</th>
                    <th>Trạng thái</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((member) => (
                    <tr key={member.id}>
                      <td><strong>{member.name}</strong></td>
                      <td>{member.team}</td>
                      <td><StatusBadge status={member.status} /></td>
                      <td className="detail-cell">
                        {member.blocker || member.submissionUrl || "Chưa có cập nhật"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              Hiển thị {filtered.length} / {state.group.members.length} thành viên
            </div>
          </section>

          <aside className="dashboard-side">
            <section className="panel completion-card">
              <span className="eyebrow">Tiến độ chung</span>
              <ProgressBar
                value={counts.completed}
                max={state.group.members.length}
                label="Đã hoàn thành"
              />
              <ProgressBar
                value={state.group.members.length - counts.unopened}
                max={state.group.members.length}
                label="Đã mở thông báo"
              />
            </section>

            <section className="panel blocker-card">
              <div className="panel-title">
                <MessageSquareWarning size={18} />
                <strong>Vướng mắc cần xử lý</strong>
              </div>
              {state.group.members
                .filter((member) => member.status === "blocked")
                .slice(0, 3)
                .map((member) => (
                  <div className="blocker-item" key={member.id}>
                    <span>{member.name.charAt(0)}</span>
                    <div><strong>{member.name}</strong><p>{member.blocker}</p></div>
                  </div>
                ))}
              <button className="text-button" type="button" onClick={() => setFilter("blocked")}>
                Xem tất cả {counts.blocked} vướng mắc
              </button>
            </section>
          </aside>
        </div>
      </div>

      {reminderOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setReminderOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reminder-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-icon"><Send size={23} /></div>
            <h2 id="reminder-title">Nhắc riêng, không làm phiền cả lớp</h2>
            <p>
              Nhịp đã loại {counts.completed} người hoàn thành và người được nhắc trong 24 giờ qua.
            </p>
            <div className="recipient-summary">
              <Users size={18} />
              <div><strong>{reminderTargets.length} người sẽ nhận nhắc</strong><span>Chưa mở, đã xác nhận hoặc đang vướng</span></div>
            </div>
            <div className="message-preview">
              <span>Tin nhắn xem trước</span>
              <p>
                Chào bạn, bài “{state.announcement.draft.title}” sắp đến hạn. Nếu đang vướng,
                bạn có thể báo riêng cho Lan trên Nhịp.
              </p>
            </div>
            <div className="modal-actions">
              <button className="button ghost" type="button" onClick={() => setReminderOpen(false)}>
                Để sau
              </button>
              <button className="button primary" type="button" onClick={handleReminder}>
                {reminderSent ? <Check size={17} /> : <Clipboard size={17} />}
                {reminderSent ? "Đã chuẩn bị tin nhắn" : "Chuẩn bị nhắc riêng"}
              </button>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
