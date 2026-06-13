import { ArrowRight, LogOut, Plus, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthState";
import { useProductState } from "../state/ProductState";

export function GroupSetup() {
  const { session, signOut } = useAuth();
  const { groups, createGroup, selectGroup, status, error } = useProductState();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const id = await createGroup(name.trim(), code.trim().toUpperCase());
    navigate(`/organizer/groups/${id}/roster`);
  };

  return (
    <div className="setup-page">
      <header className="setup-header">
        <div className="brand"><span className="brand-mark"><Users size={21} /></span><strong>Nhịp</strong></div>
        <div className="setup-user">
          <span>{session?.email}</span>
          <button className="button ghost compact" onClick={signOut}><LogOut size={15} /> Đăng xuất</button>
        </div>
      </header>
      <main className="setup-main">
        <div className="page-heading">
          <div><span className="step-label">Thiết lập</span><h1>Chọn hoặc tạo nhóm</h1><p>Mỗi nhóm có danh sách thành viên và thông báo riêng.</p></div>
        </div>
        {groups.length > 0 && (
          <section className="existing-groups">
            <h2>Nhóm của bạn</h2>
            <div className="group-list">
              {groups.map((group) => (
                <button
                  key={group.id}
                  className="group-option"
                  onClick={async () => {
                    await selectGroup(group.id);
                    navigate(`/organizer/groups/${group.id}/announcements/new`);
                  }}
                >
                  <span><Users size={19} /></span>
                  <div><strong>{group.name}</strong><small>{group.code}</small></div>
                  <ArrowRight size={18} />
                </button>
              ))}
            </div>
          </section>
        )}
        <section className="panel setup-form-panel">
          <div className="panel-title"><Plus size={18} /><strong>Tạo nhóm mới</strong></div>
          <form onSubmit={submit} className="setup-form">
            <label><span className="field-label">Tên nhóm / lớp</span><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Digital Marketing Class" /></label>
            <label><span className="field-label">Mã ngắn</span><input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="MKT203" maxLength={30} /></label>
            {error && <div className="error-banner">{error}</div>}
            <button className="button primary" disabled={status === "loading"}>{status === "loading" ? "Đang tạo…" : "Tạo nhóm và thêm thành viên"}<ArrowRight size={17} /></button>
          </form>
        </section>
      </main>
    </div>
  );
}
