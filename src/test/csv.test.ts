import { describe, expect, it } from "vitest";
import { parseRosterCsv, validateRosterRow } from "../services/csv";

describe("roster CSV", () => {
  it("parses required and optional columns", () => {
    const rows = parseRosterCsv(
      'name,student_id,team,email\n"Nguyễn Minh Anh",SV001,Nhóm 1,anh@example.com'
    );
    expect(rows).toEqual([
      {
        name: "Nguyễn Minh Anh",
        student_id: "SV001",
        team: "Nhóm 1",
        email: "anh@example.com",
        errors: []
      }
    ]);
  });

  it("rejects missing headers", () => {
    expect(() => parseRosterCsv("name,team\nLan,Nhóm 1")).toThrow(/student_id/);
  });

  it("flags invalid email and duplicate identifiers", () => {
    const row = validateRosterRow(
      { name: "Lan", student_id: "SV001", team: "Nhóm 1", email: "invalid" },
      new Set(["SV001"])
    );
    expect(row.errors).toEqual(expect.arrayContaining(["Trùng mã thành viên", "Email không hợp lệ"]));
  });
});
