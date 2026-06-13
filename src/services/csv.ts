import type { RosterRow } from "../types";

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "_");

const parseLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRosterRow = (
  row: Omit<RosterRow, "errors">,
  existingIds = new Set<string>()
): RosterRow => {
  const errors: string[] = [];
  if (!row.name.trim()) errors.push("Thiếu họ tên");
  if (!row.student_id.trim()) errors.push("Thiếu mã thành viên");
  if (existingIds.has(row.student_id.trim())) errors.push("Trùng mã thành viên");
  if (row.email && !emailPattern.test(row.email)) errors.push("Email không hợp lệ");
  return { ...row, errors };
};

export const parseRosterCsv = (input: string): RosterRow[] => {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]).map(normalizeHeader);
  const required = ["name", "student_id", "team"];
  if (required.some((header) => !headers.includes(header))) {
    throw new Error("CSV cần các cột name, student_id, team và email (không bắt buộc).");
  }
  const seen = new Set<string>();
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const record = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    const row = validateRosterRow(
      {
        name: record.name,
        student_id: record.student_id,
        team: record.team,
        email: record.email || undefined
      },
      seen
    );
    seen.add(row.student_id);
    return row;
  });
};

export const rosterTemplate =
  "name,student_id,team,email\nNguyễn Minh Anh,SV001,Nhóm 1,minhanh@example.com\n";
