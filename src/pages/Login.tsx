import { CheckCircle2, Mail, Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthState";

export function Login() {
  const { session, sendMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/organizer/setup" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await sendMagicLink(email);
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể gửi liên kết.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="brand auth-brand">
          <span className="brand-mark"><Sparkles size={22} /></span>
          <strong>Nhịp</strong>
        </div>
        {sent ? (
          <div className="auth-success">
            <span><CheckCircle2 size={30} /></span>
            <h1>Kiểm tra email của bạn</h1>
            <p>Nhịp đã gửi liên kết đăng nhập đến <strong>{email}</strong>.</p>
            <button className="button ghost full" onClick={() => setSent(false)}>
              Dùng email khác
            </button>
          </div>
        ) : (
          <>
            <span className="pill">Dành cho người tổ chức</span>
            <h1>Đăng nhập để quản lý nhóm</h1>
            <p>Không cần mật khẩu. Nhịp gửi một liên kết đăng nhập an toàn qua email.</p>
            <form onSubmit={submit} className="auth-form">
              <label>
                <span className="field-label">Email</span>
                <div className="input-with-icon">
                  <Mail size={17} />
                  <input
                    type="email"
                    required
                    placeholder="lan@university.edu.vn"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </label>
              {error && <div className="error-banner">{error}</div>}
              <button className="button primary full" disabled={loading}>
                {loading ? "Đang gửi…" : "Gửi liên kết đăng nhập"}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
