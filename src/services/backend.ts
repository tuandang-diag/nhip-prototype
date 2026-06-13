import type {
  Announcement,
  AnnouncementDraft,
  DemoState,
  GroundedAnswer,
  Group,
  InviteLink,
  Member,
  MemberStatus,
  OrganizerSession,
  RosterRow
} from "../types";
import { requireSupabase } from "./supabase";

type DbMember = {
  id: string;
  name: string;
  student_id: string;
  team: string;
  email: string | null;
};

const toVietnamLocalInput = (value: unknown): string => {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  })
    .formatToParts(new Date(String(value)))
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

const toDatabaseDeadline = (value: string): string | null => {
  if (!value) return null;
  return new Date(`${value}:00+07:00`).toISOString();
};

const mapDraft = (row: Record<string, unknown>): AnnouncementDraft => ({
  title: String(row.title ?? ""),
  summary: String(row.summary ?? ""),
  deadline: toVietnamLocalInput(row.deadline),
  room: String(row.room ?? ""),
  actionLabel: String(row.action_label ?? ""),
  completionType: row.completion_type === "acknowledgement" ? "acknowledgement" : "submission",
  attachments: ((row.attachments as Array<Record<string, unknown>>) ?? []).map(
    (attachment, index) => ({
      id: String(attachment.id ?? `attachment-${index + 1}`),
      name: String(attachment.name ?? ""),
      type: attachment.type === "pdf" ? "pdf" : "link",
      url: String(attachment.url ?? "")
    })
  ),
  faq: ((row.approved_faq as Array<Record<string, unknown>>) ?? []).map((item, index) => ({
    id: String(item.id ?? `faq-${index + 1}`),
    question: String(item.question ?? ""),
    answer: String(item.answer ?? ""),
    evidence: String(item.evidence ?? "")
  }))
});

const mapAnnouncement = (row: Record<string, unknown>): Announcement => ({
  id: String(row.id),
  sourceText: String(row.source_text ?? ""),
  draft: mapDraft(row),
  reviewComplete: row.status !== "draft" || Boolean(row.title),
  publishedAt: row.published_at ? String(row.published_at) : null,
  status: row.status as Announcement["status"],
  aiEvidence: (row.ai_evidence as Announcement["aiEvidence"]) ?? [],
  aiWarnings: (row.ai_warnings as string[]) ?? [],
  validationIssues: (row.validation_issues as string[]) ?? []
});

export const authApi = {
  async session(): Promise<OrganizerSession | null> {
    const client = requireSupabase();
    const { data } = await client.auth.getSession();
    const user = data.session?.user;
    if (!user?.email) return null;
    return {
      userId: user.id,
      email: user.email,
      displayName: String(user.user_metadata.display_name ?? user.email.split("@")[0])
    };
  },
  async sendMagicLink(email: string) {
    const { error } = await requireSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) throw error;
  },
  async signOut() {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw error;
  }
};

export const organizerApi = {
  async listGroups(): Promise<Array<{ id: string; name: string; code: string }>> {
    const { data, error } = await requireSupabase()
      .from("groups")
      .select("id,name,code")
      .order("created_at");
    if (error) throw error;
    return data ?? [];
  },
  async createGroup(name: string, code: string) {
    const { data, error } = await requireSupabase()
      .rpc("create_group", { group_name: name, group_code: code });
    if (error) throw error;
    return { id: data.id, name: data.name, code: data.code };
  },
  async importRoster(groupId: string, rows: RosterRow[]) {
    const roster = rows.filter((row) => !row.errors.length).map(({ errors: _, ...row }) => row);
    const { data, error } = await requireSupabase().rpc("import_group_members", {
      target_group_id: groupId,
      roster
    });
    if (error) throw error;
    return data;
  },
  async listMembers(groupId: string): Promise<DbMember[]> {
    const { data, error } = await requireSupabase()
      .from("members")
      .select("id,name,student_id,team,email")
      .eq("group_id", groupId)
      .order("name");
    if (error) throw error;
    return data ?? [];
  },
  async generateInvites(memberIds: string[]): Promise<InviteLink[]> {
    const { data, error } = await requireSupabase().functions.invoke("manage-invites", {
      body: { member_ids: memberIds }
    });
    if (error) throw error;
    return data.links.map((link: Record<string, string>) => ({
      memberId: link.member_id,
      name: link.name,
      studentId: link.student_id,
      token: link.token
    }));
  },
  async generateDraft(groupId: string, sourceText: string) {
    const { data, error } = await requireSupabase().functions.invoke("generate-announcement-draft", {
      body: { group_id: groupId, source_text: sourceText }
    });
    if (error) throw error;
    return data.draft;
  },
  async createDraft(groupId: string, userId: string, sourceText: string, aiDraft: Record<string, unknown>) {
    const { data, error } = await requireSupabase()
      .from("announcements")
      .insert({
        group_id: groupId,
        created_by: userId,
        source_text: sourceText,
        title: aiDraft.title,
        summary: aiDraft.summary,
        deadline:
          typeof aiDraft.deadline === "string" && aiDraft.deadline
            ? new Date(aiDraft.deadline).toISOString()
            : null,
        room: aiDraft.room,
        action_label: aiDraft.action_label,
        completion_type: aiDraft.completion_type,
        attachments: aiDraft.attachments,
        approved_faq: aiDraft.faq,
        ai_evidence: aiDraft.evidence,
        ai_warnings: aiDraft.warnings,
        validation_issues: aiDraft.validation_issues
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapAnnouncement(data);
  },
  async updateAnnouncement(announcementId: string, draft: AnnouncementDraft, publish = false) {
    const patch = {
      title: draft.title,
      summary: draft.summary,
      deadline: toDatabaseDeadline(draft.deadline),
      room: draft.room,
      action_label: draft.actionLabel,
      completion_type: draft.completionType,
      attachments: draft.attachments,
      approved_faq: draft.faq,
      ...(publish ? { status: "published", published_at: new Date().toISOString() } : {})
    };
    const { data, error } = await requireSupabase()
      .from("announcements")
      .update(patch)
      .eq("id", announcementId)
      .select("*")
      .single();
    if (error) throw error;
    return mapAnnouncement(data);
  },
  async loadGroupState(groupId: string, announcementId?: string): Promise<DemoState> {
    const client = requireSupabase();
    const [{ data: group, error: groupError }, { data: profile }] = await Promise.all([
      client.from("groups").select("id,name,code,created_by").eq("id", groupId).single(),
      client.from("profiles").select("display_name").maybeSingle()
    ]);
    if (groupError) throw groupError;
    let query = client.from("announcements").select("*").eq("group_id", groupId);
    query = announcementId
      ? query.eq("id", announcementId)
      : query.order("created_at", { ascending: false }).limit(1);
    const { data: announcementRows, error: announcementError } = await query;
    if (announcementError) throw announcementError;
    const announcementRow = announcementRows?.[0];
    if (!announcementRow) throw new Error("Chưa có thông báo.");
    const [{ data: dbMembers }, { data: actions }, { data: reminders }] = await Promise.all([
      client.from("members").select("id,name,student_id,team,email").eq("group_id", groupId),
      client.from("member_actions").select("*").eq("announcement_id", announcementRow.id),
      client.from("reminders").select("*").eq("announcement_id", announcementRow.id)
    ]);
    const actionMap = new Map((actions ?? []).map((action) => [action.member_id, action]));
    const reminderMap = new Map<string, Array<{ sentAt: string; channel: "copy" }>>();
    (reminders ?? []).forEach((reminder) => {
      const current = reminderMap.get(reminder.member_id) ?? [];
      current.push({ sentAt: reminder.created_at, channel: "copy" });
      reminderMap.set(reminder.member_id, current);
    });
    const members: Member[] = (dbMembers ?? []).map((member) => {
      const action = actionMap.get(member.id);
      return {
        id: member.id,
        name: member.name,
        team: member.team,
        status: (action?.status ?? "unopened") as MemberStatus,
        openedAt: action?.opened_at ?? null,
        acknowledgedAt: action?.acknowledged_at ?? null,
        completedAt: action?.completed_at ?? null,
        submissionUrl: action?.submission_url ?? "",
        blocker: action?.blocker ?? "",
        reminders: reminderMap.get(member.id) ?? []
      };
    });
    const mappedGroup: Group = {
      id: group.id,
      name: group.name,
      code: group.code,
      organizer: {
        name: profile?.display_name ?? "Người tổ chức",
        role: `Người tổ chức · ${group.code}`,
        verified: true
      },
      members
    };
    return {
      schemaVersion: 1,
      group: mappedGroup,
      announcement: mapAnnouncement(announcementRow),
      activity: []
    };
  },
  async prepareReminders(announcementId: string, memberIds: string[]) {
    const { data, error } = await requireSupabase().rpc("prepare_reminders", {
      target_announcement_id: announcementId,
      target_member_ids: memberIds
    });
    if (error) throw error;
    return data as number;
  }
};

export const memberApi = {
  async read(token: string, announcementId: string) {
    const { data, error } = await requireSupabase().functions.invoke("member-access", {
      body: { token, announcement_id: announcementId, operation: "read" }
    });
    if (error) throw error;
    return data;
  },
  async update(
    token: string,
    announcementId: string,
    operation: "acknowledge" | "submit" | "block",
    value = ""
  ) {
    const body =
      operation === "submit"
        ? { token, announcement_id: announcementId, operation, submission_url: value }
        : operation === "block"
          ? { token, announcement_id: announcementId, operation, blocker: value }
          : { token, announcement_id: announcementId, operation };
    const { data, error } = await requireSupabase().functions.invoke("member-access", { body });
    if (error) throw error;
    return data;
  },
  async answer(token: string, announcementId: string, question: string): Promise<GroundedAnswer> {
    const { data, error } = await requireSupabase().functions.invoke("answer-member-question", {
      body: { token, announcement_id: announcementId, question }
    });
    if (error) throw error;
    return data;
  }
};
