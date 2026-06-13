import { describe, expect, it, vi } from "vitest";
import { createSeedState } from "../data/seed";
import { canRemind, toCsv } from "../utils";

describe("dashboard utilities", () => {
  it("excludes completed members from reminders", () => {
    const member = createSeedState().group.members.find((item) => item.status === "completed")!;
    expect(canRemind(member)).toBe(false);
  });

  it("throttles reminders sent in the previous 24 hours", () => {
    vi.setSystemTime(new Date("2026-06-13T10:00:00.000Z"));
    const member = createSeedState().group.members[0];
    member.reminders.push({
      sentAt: "2026-06-13T09:00:00.000Z",
      channel: "copy"
    });
    expect(canRemind(member)).toBe(false);
    vi.useRealTimers();
  });

  it("creates a CSV with all members", () => {
    const csv = toCsv(createSeedState().group.members);
    expect(csv.split("\n")).toHaveLength(61);
    expect(csv).toContain("Họ tên,Nhóm,Trạng thái");
  });
});
