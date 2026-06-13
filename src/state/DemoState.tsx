import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { loadState, resetState, saveState } from "../services/storage";
import type { AnnouncementDraft, DemoState, MemberStatus } from "../types";

interface DemoActions {
  state: DemoState;
  updateDraft: (patch: Partial<AnnouncementDraft>) => void;
  publish: () => void;
  updateMember: (
    memberId: string,
    patch: {
      status: MemberStatus;
      submissionUrl?: string;
      blocker?: string;
    }
  ) => void;
  sendReminders: (memberIds: string[]) => void;
  reset: () => void;
}

const DemoStateContext = createContext<DemoActions | null>(null);

const activityId = () => `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function DemoStateProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<DemoState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const value = useMemo<DemoActions>(
    () => ({
      state,
      updateDraft: (patch) => {
        setState((current) => ({
          ...current,
          announcement: {
            ...current.announcement,
            draft: { ...current.announcement.draft, ...patch },
            reviewComplete: true
          }
        }));
      },
      publish: () => {
        const at = new Date().toISOString();
        setState((current) => ({
          ...current,
          announcement: {
            ...current.announcement,
            reviewComplete: true,
            publishedAt: at
          },
          activity: [
            { id: activityId(), at, text: "Lan đã duyệt và xuất bản thông báo." },
            ...current.activity
          ]
        }));
      },
      updateMember: (memberId, patch) => {
        const at = new Date().toISOString();
        setState((current) => ({
          ...current,
          group: {
            ...current.group,
            members: current.group.members.map((member) =>
              member.id === memberId
                ? {
                    ...member,
                    status: patch.status,
                    openedAt: member.openedAt ?? at,
                    acknowledgedAt:
                      patch.status === "unopened" ? null : member.acknowledgedAt ?? at,
                    completedAt: patch.status === "completed" ? at : null,
                    submissionUrl: patch.submissionUrl ?? member.submissionUrl,
                    blocker: patch.blocker ?? (patch.status === "blocked" ? member.blocker : "")
                  }
                : member
            )
          },
          activity: [
            {
              id: activityId(),
              at,
              text: `Trạng thái thành viên đã đổi thành ${patch.status}.`
            },
            ...current.activity
          ]
        }));
      },
      sendReminders: (memberIds) => {
        const at = new Date().toISOString();
        setState((current) => ({
          ...current,
          group: {
            ...current.group,
            members: current.group.members.map((member) =>
              memberIds.includes(member.id)
                ? {
                    ...member,
                    reminders: [...member.reminders, { sentAt: at, channel: "copy" }]
                  }
                : member
            )
          },
          activity: [
            {
              id: activityId(),
              at,
              text: `Đã chuẩn bị nhắc riêng cho ${memberIds.length} thành viên.`
            },
            ...current.activity
          ]
        }));
      },
      reset: () => setState(resetState())
    }),
    [state]
  );

  return <DemoStateContext.Provider value={value}>{children}</DemoStateContext.Provider>;
}

export const useDemoState = (): DemoActions => {
  const value = useContext(DemoStateContext);
  if (!value) throw new Error("useDemoState must be used inside DemoStateProvider");
  return value;
};
