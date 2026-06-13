import { ArrowRight, Check, Download, FileSpreadsheet, Link2, Upload, UserPlus } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { parseRosterCsv, rosterTemplate, validateRosterRow } from "../services/csv";
import { organizerApi } from "../services/backend";
import { isDemoMode } from "../services/config";
import { useProductState } from "../state/ProductState";
import type { RosterRow } from "../types";

const downloadText = (text: string, filename: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export function RosterImport() {
  const { groupId = "" } = useParams();
  const { importRoster, generateInvites, invites, status, error } = useProductState();
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const navigate = useNavigate();

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setRows(parseRosterCsv(await file.text()));
      setParseError("");
    } catch (caught) {
      setParseError(caught instanceof Error ? caught.message : "Không đọc được CSV.");
    }
  };

  const updateRow = (index: number, key: keyof Omit<RosterRow, "errors">, value: string) => {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? validateRosterRow({ ...row, [key]: value })
          : row
      )
    );
  };

  const addRow = () =>
    setRows((current) => [...current, { name: "", student_id: "", team: "", email: "", errors: ["Thiếu họ tên", "Thiếu mã thành viên"] }]);

  const doImport = async () => {
    await importRoster(groupId, rows);
    if (isDemoMode) {
      const ids = rows.map((_, index) => `demo-import-${index}`);
      setImportedIds(ids);
      await generateInvites(ids);
    } else {
      const members = await organizerApi.listMembers(groupId);
      const ids = members.map((member) => member.id);
      setImportedIds(ids);
      await generateInvites(ids);
    }
  };

  const inviteCsv = invites
    .map((invite) => `"${invite.name}","${invite.studentId}","${invite.token}"`)
    .join("\n");

  return (
    <div className="setup-page">
      <header className="setup-header"><div className="brand"><span className="brand-mark"><UsersIcon /></span><strong>Nhịp</strong></div><span className="step-label">Bước 2 / 2</span></header>
      <main className="setup-main roster-main">
        <div className="page-heading">
          <div><span className="step-label">Danh sách thành viên</span><h1>Nhập roster của nhóm</h1><p>CSV cần các cột name, student_id, team và email không bắt buộc.</p></div>
          <button className="button secondary" onClick={() => downloadText(rosterTemplate, "nhip-roster-template.csv")}><Download size={17} /> Tải file mẫu</button>
        </div>
        <section className="panel upload-panel">
          <label className="file-drop">
            <Upload size={24} />
            <strong>Chọn file CSV</strong>
            <span>Hoặc thêm từng người bằng tay</span>
            <input className="sr-only" type="file" accept=".csv,text/csv" onChange={loadFile} />
          </label>
          <button className="button ghost" onClick={addRow}><UserPlus size={17} /> Thêm một người</button>
        </section>
        {(parseError || error) && <div className="error-banner">{parseError || error}</div>}
        {rows.length > 0 && (
          <section className="panel roster-table-panel">
            <div className="table-toolbar"><div><h2>Xem trước {rows.length} thành viên</h2><p>{rows.filter((row) => row.errors.length).length} dòng cần sửa</p></div></div>
            <div className="member-table-wrap">
              <table className="member-table roster-table">
                <thead><tr><th>Họ tên</th><th>Mã</th><th>Nhóm</th><th>Email</th><th>Kiểm tra</th></tr></thead>
                <tbody>{rows.map((row, index) => (
                  <tr key={`${row.student_id}-${index}`}>
                    <td><input aria-label={`Tên ${index + 1}`} value={row.name} onChange={(e) => updateRow(index, "name", e.target.value)} /></td>
                    <td><input aria-label={`Mã ${index + 1}`} value={row.student_id} onChange={(e) => updateRow(index, "student_id", e.target.value)} /></td>
                    <td><input aria-label={`Nhóm ${index + 1}`} value={row.team} onChange={(e) => updateRow(index, "team", e.target.value)} /></td>
                    <td><input aria-label={`Email ${index + 1}`} value={row.email ?? ""} onChange={(e) => updateRow(index, "email", e.target.value)} /></td>
                    <td>{row.errors.length ? <span className="row-errors">{row.errors.join(", ")}</span> : <span className="field-valid"><Check size={14} /> Hợp lệ</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        )}
        <div className="roster-actions">
          {invites.length > 0 ? (
            <>
              <button className="button secondary" onClick={() => downloadText(`name,student_id,invite_token\n${inviteCsv}`, "nhip-invite-tokens.csv")}><Link2 size={17} /> Tải mã mời dự phòng</button>
              <button className="button primary" onClick={() => navigate(`/organizer/groups/${groupId}/announcements/new`)}>Soạn thông báo đầu tiên <ArrowRight size={17} /></button>
            </>
          ) : (
            <button className="button primary" onClick={doImport} disabled={!rows.length || rows.some((row) => row.errors.length > 0) || status === "loading"}><FileSpreadsheet size={17} /> {status === "loading" ? "Đang nhập…" : "Nhập roster và tạo liên kết"}</button>
          )}
        </div>
        {importedIds.length > 0 && <p className="success-note">Đã nhập {importedIds.length} thành viên và tạo liên kết riêng.</p>}
      </main>
    </div>
  );
}

function UsersIcon() {
  return <FileSpreadsheet size={21} />;
}
