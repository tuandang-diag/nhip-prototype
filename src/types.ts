export type MemberStatus = "unopened" | "acknowledged" | "completed" | "blocked";
export type CompletionType = "acknowledgement" | "submission";

export interface Attachment {
  id: string;
  name: string;
  type: "pdf" | "link";
  url: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  evidence?: string;
}

export interface AiEvidence {
  field: string;
  quote: string;
}

export interface AnnouncementDraft {
  title: string;
  summary: string;
  deadline: string;
  room: string;
  actionLabel: string;
  completionType: CompletionType;
  attachments: Attachment[];
  faq: FaqItem[];
}

export interface Announcement {
  id: string;
  sourceText: string;
  draft: AnnouncementDraft;
  reviewComplete: boolean;
  publishedAt: string | null;
  status?: "draft" | "published" | "closed";
  aiEvidence?: AiEvidence[];
  aiWarnings?: string[];
  validationIssues?: string[];
}

export interface ReminderRecord {
  sentAt: string;
  channel: "copy";
}

export interface Member {
  id: string;
  name: string;
  team: string;
  status: MemberStatus;
  openedAt: string | null;
  acknowledgedAt: string | null;
  completedAt: string | null;
  submissionUrl: string;
  blocker: string;
  reminders: ReminderRecord[];
}

export interface Organizer {
  name: string;
  role: string;
  verified: boolean;
}

export interface Group {
  id: string;
  name: string;
  code: string;
  organizer: Organizer;
  members: Member[];
}

export interface OrganizerSession {
  userId: string;
  email: string;
  displayName: string;
}

export interface RosterRow {
  name: string;
  student_id: string;
  team: string;
  email?: string;
  errors: string[];
}

export interface InviteLink {
  memberId: string;
  name: string;
  studentId: string;
  token: string;
}

export interface GroundedAnswer {
  supported: boolean;
  answer: string;
  evidence: string;
}

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface Activity {
  id: string;
  at: string;
  text: string;
}

export interface DemoState {
  schemaVersion: 1;
  group: Group;
  announcement: Announcement;
  activity: Activity[];
}
