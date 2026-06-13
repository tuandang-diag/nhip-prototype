import type { DemoState, Member, MemberStatus } from "../types";

const names = [
  "Nguyễn Minh Anh", "Trần Gia Bảo", "Lê Hoàng Duy", "Phạm Thu Hà",
  "Võ Quang Huy", "Đặng Khánh Linh", "Bùi Đức Long", "Đỗ Ngọc Mai",
  "Hồ Nhật Nam", "Ngô Thảo Nhi", "Dương Minh Phúc", "Lý Tú Quyên",
  "Mai Anh Thư", "Tạ Quốc Việt", "Huỳnh Thanh Vy"
];

const makeMembers = (): Member[] =>
  Array.from({ length: 60 }, (_, index) => {
    const distribution: MemberStatus =
      index < 12 ? "unopened" : index < 27 ? "acknowledged" : index < 54 ? "completed" : "blocked";
    const now = "2026-06-13T03:00:00.000Z";
    return {
      id: `member-${index + 1}`,
      name: `${names[index % names.length]} ${Math.floor(index / names.length) + 1}`,
      team: `Nhóm ${Math.floor(index / 5) + 1}`,
      status: distribution,
      openedAt: distribution === "unopened" ? null : now,
      acknowledgedAt: ["acknowledged", "completed", "blocked"].includes(distribution) ? now : null,
      completedAt: distribution === "completed" ? now : null,
      submissionUrl:
        distribution === "completed"
          ? `https://drive.google.com/team-${Math.floor(index / 5) + 1}`
          : "",
      blocker:
        distribution === "blocked"
          ? index % 2 === 0
            ? "Chưa rõ yêu cầu định dạng slide."
            : "Nhóm chưa thống nhất người thuyết trình."
          : "",
      reminders: []
    };
  });

export const createSeedState = (): DemoState => ({
  schemaVersion: 1,
  group: {
    id: "digital-marketing",
    name: "Digital Marketing Class",
    code: "MKT203",
    organizer: {
      name: "Trần Ngọc Lan",
      role: "Lớp trưởng · MKT203",
      verified: true
    },
    members: makeMembers()
  },
  announcement: {
    id: "presentation-deadline",
    sourceText:
      "Cả lớp lưu ý nha, bài thuyết trình cuối kỳ nộp trước 23:59 thứ Sáu 19/06. Mỗi nhóm gửi link Google Drive gồm slide PDF và danh sách thành viên. Thuyết trình sáng thứ Bảy tại phòng B.305. Nhớ đặt quyền xem link, trễ hạn sẽ không được cập nhật nữa. Rubric cô đã gửi trong Drive lớp. Có gì chưa rõ thì hỏi mình trước tối thứ Năm.",
    draft: {
      title: "Nộp bài thuyết trình cuối kỳ",
      summary:
        "Mỗi nhóm nộp một liên kết Google Drive gồm slide PDF và danh sách thành viên trước hạn. Hãy bật quyền xem trước khi gửi.",
      deadline: "2026-06-19T23:59",
      room: "B.503",
      actionLabel: "Gửi liên kết bài của nhóm",
      completionType: "submission",
      attachments: [
        {
          id: "rubric",
          name: "Rubric thuyết trình cuối kỳ.pdf",
          type: "pdf",
          url: "#rubric"
        }
      ],
      faq: [
        {
          id: "format",
          question: "Bài nộp cần định dạng gì?",
          answer: "Một liên kết Google Drive gồm slide dạng PDF và danh sách thành viên."
        },
        {
          id: "permission",
          question: "Có cần mở quyền xem không?",
          answer: "Có. Hãy kiểm tra người có liên kết có thể xem trước khi gửi."
        },
        {
          id: "late",
          question: "Có được nộp trễ không?",
          answer: "Thông báo gốc ghi rõ bài trễ hạn sẽ không được cập nhật."
        }
      ]
    },
    reviewComplete: false,
    publishedAt: null
  },
  activity: [
    {
      id: "seed-1",
      at: "2026-06-13T03:00:00.000Z",
      text: "Bản nháp AI đã sẵn sàng để Lan kiểm tra."
    }
  ]
});
