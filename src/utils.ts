import type { Member, MemberStatus } from "./types";

export const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

export const statusLabels: Record<MemberStatus, string> = {
  unopened: "Chưa mở",
  acknowledged: "Đã xác nhận",
  completed: "Đã hoàn thành",
  blocked: "Đang vướng"
};

export const canRemind = (member: Member): boolean => {
  const last = member.reminders.at(-1);
  if (!last) return member.status !== "completed";
  return (
    member.status !== "completed" &&
    Date.now() - new Date(last.sentAt).getTime() >= 24 * 60 * 60 * 1000
  );
};

export const toCsv = (members: Member[]): string => {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = members.map((member) =>
    [
      member.name,
      member.team,
      statusLabels[member.status],
      member.submissionUrl,
      member.blocker
    ]
      .map(escape)
      .join(",")
  );
  return ["Họ tên,Nhóm,Trạng thái,Liên kết,Vướng mắc", ...rows].join("\n");
};
