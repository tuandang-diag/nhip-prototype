import {
  BellRing,
  ClipboardCheck,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  RotateCcw,
  Sparkles,
  UserRoundPlus
} from "lucide-react";
import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import { isDemoMode } from "../services/config";
import { useAuth } from "../state/AuthState";
import { useProductState } from "../state/ProductState";

export function AppShell({ children }: PropsWithChildren) {
  const { state, reset, selectedGroupId, groups } = useProductState();
  const { session, signOut } = useAuth();
  const currentGroup = groups.find((group) => group.id === selectedGroupId);
  const navItems = [
    {
      to: `/organizer/groups/${selectedGroupId}/announcements/new`,
      label: "Soạn thông báo",
      icon: Sparkles
    },
    {
      to: state
        ? `/organizer/groups/${selectedGroupId}/announcements/${state.announcement.id}/dashboard`
        : `/organizer/groups/${selectedGroupId}/announcements/new`,
      label: "Theo dõi nhóm",
      icon: LayoutDashboard
    },
    {
      to: `/organizer/groups/${selectedGroupId}/roster`,
      label: "Thành viên",
      icon: UserRoundPlus
    }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <ClipboardCheck size={22} />
          </span>
          <span>
            <strong>Nhịp</strong>
            <small>Rõ việc, đúng người</small>
          </span>
        </div>

        <div className="class-card">
          <span className="eyebrow">Không gian đang mở</span>
          <strong>{state?.group.name ?? currentGroup?.name ?? "Nhóm mới"}</strong>
          <span>{state?.group.code ?? currentGroup?.code} · {state?.group.members.length ?? "—"} thành viên</span>
        </div>

        <nav aria-label="Điều hướng chính">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              <Icon size={19} aria-hidden="true" />
              {label}
              {label === "Theo dõi nhóm" && state?.announcement.publishedAt && (
                <span className="nav-dot" aria-label="Đã xuất bản" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {isDemoMode ? (
            <button className="button ghost full" type="button" onClick={reset}>
              <RotateCcw size={17} aria-hidden="true" /> Đặt lại bản demo
            </button>
          ) : (
            <button className="button ghost full" type="button" onClick={signOut}>
              <LogOut size={17} aria-hidden="true" /> Đăng xuất
            </button>
          )}
          <p>{isDemoMode ? "Đang chạy chế độ demo." : session?.email}</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Prototype tương tác</span>
            <strong>Chào {session?.displayName ?? "bạn"}, hôm nay mình làm rõ việc gì?</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Thông báo">
              <BellRing size={19} />
            </button>
            {isDemoMode && (
              <a className="button secondary compact" href={`/member/${state?.announcement.id ?? "demo"}?token=demo`}>
                Mở thẻ thành viên <ExternalLink size={16} aria-hidden="true" />
              </a>
            )}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
