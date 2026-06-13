import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { createSeedState } from "../data/seed";
import { organizerApi } from "../services/backend";
import { isDemoMode } from "../services/config";
import { loadState, resetState, saveState } from "../services/storage";
import { supabase } from "../services/supabase";
import type {
  Announcement,
  AnnouncementDraft,
  AsyncStatus,
  DemoState,
  InviteLink,
  MemberStatus,
  RosterRow
} from "../types";
import { useAuth } from "./AuthState";

interface ProductValue {
  state: DemoState | null;
  groups: Array<{ id: string; name: string; code: string }>;
  selectedGroupId: string | null;
  status: AsyncStatus;
  error: string;
  invites: InviteLink[];
  selectGroup: (groupId: string) => Promise<void>;
  createGroup: (name: string, code: string) => Promise<string>;
  importRoster: (groupId: string, rows: RosterRow[]) => Promise<void>;
  generateInvites: (memberIds: string[]) => Promise<void>;
  generateDraft: (sourceText: string) => Promise<Announcement>;
  updateDraft: (patch: Partial<AnnouncementDraft>) => Promise<void>;
  publish: () => Promise<void>;
  updateMember: (
    memberId: string,
    patch: { status: MemberStatus; submissionUrl?: string; blocker?: string }
  ) => Promise<void>;
  sendReminders: (memberIds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

const ProductContext = createContext<ProductValue | null>(null);
const selectedKey = "nhip-selected-group";

export function ProductStateProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [state, setState] = useState<DemoState | null>(() => (isDemoMode ? loadState() : null));
  const [groups, setGroups] = useState<Array<{ id: string; name: string; code: string }>>(
    isDemoMode ? [{ id: createSeedState().group.id, name: createSeedState().group.name, code: createSeedState().group.code }] : []
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    isDemoMode ? createSeedState().group.id : window.localStorage.getItem(selectedKey)
  );
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [error, setError] = useState("");
  const [invites, setInvites] = useState<InviteLink[]>([]);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setStatus("loading");
    setError("");
    try {
      const result = await operation();
      setStatus("success");
      return result;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Đã có lỗi xảy ra.";
      setError(message);
      setStatus("error");
      throw caught;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (isDemoMode) {
      setState(loadState());
      return;
    }
    if (!selectedGroupId) return;
    await run(async () => setState(await organizerApi.loadGroupState(selectedGroupId)));
  }, [run, selectedGroupId]);

  useEffect(() => {
    if (!session || isDemoMode) return;
    run(async () => {
      const found = await organizerApi.listGroups();
      setGroups(found);
      const selected =
        found.find((group) => group.id === selectedGroupId)?.id ?? found[0]?.id ?? null;
      setSelectedGroupId(selected);
      if (selected) {
        window.localStorage.setItem(selectedKey, selected);
        try {
          setState(await organizerApi.loadGroupState(selected));
        } catch (caught) {
          if (!(caught instanceof Error && caught.message === "Chưa có thông báo.")) throw caught;
          setState(null);
        }
      }
    }).catch(() => undefined);
  }, [session, run]);

  useEffect(() => {
    if (isDemoMode || !supabase || !selectedGroupId || !state?.announcement.id) return;
    const channel = supabase
      .channel(`actions:${state.announcement.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "member_actions",
          filter: `announcement_id=eq.${state.announcement.id}`
        },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGroupId, state?.announcement.id, refresh]);

  useEffect(() => {
    if (isDemoMode && state) saveState(state);
  }, [state]);

  const value = useMemo<ProductValue>(
    () => ({
      state,
      groups,
      selectedGroupId,
      status,
      error,
      invites,
      selectGroup: async (groupId) => {
        setSelectedGroupId(groupId);
        window.localStorage.setItem(selectedKey, groupId);
        if (!isDemoMode) await run(async () => setState(await organizerApi.loadGroupState(groupId)));
      },
      createGroup: async (name, code) => {
        if (!session) throw new Error("Bạn cần đăng nhập.");
        if (isDemoMode) return createSeedState().group.id;
        return run(async () => {
          const group = await organizerApi.createGroup(name, code, session.userId);
          setGroups((current) => [...current, group]);
          setSelectedGroupId(group.id);
          window.localStorage.setItem(selectedKey, group.id);
          return group.id;
        });
      },
      importRoster: async (groupId, rows) => {
        if (isDemoMode) return;
        await run(async () => organizerApi.importRoster(groupId, rows));
      },
      generateInvites: async (memberIds) => {
        if (isDemoMode) {
          setInvites(
            memberIds.map((id) => ({
              memberId: id,
              name: state?.group.members.find((member) => member.id === id)?.name ?? id,
              studentId: id,
              token: `demo-${id}`
            }))
          );
          return;
        }
        await run(async () => setInvites(await organizerApi.generateInvites(memberIds)));
      },
      generateDraft: async (sourceText) => {
        if (!selectedGroupId || !session) throw new Error("Chưa chọn nhóm.");
        if (isDemoMode) {
          const seed = createSeedState().announcement;
          const next = { ...seed, sourceText };
          setState((current) => (current ? { ...current, announcement: next } : createSeedState()));
          return next;
        }
        return run(async () => {
          const aiDraft = await organizerApi.generateDraft(selectedGroupId, sourceText);
          const announcement = await organizerApi.createDraft(
            selectedGroupId,
            session.userId,
            sourceText,
            aiDraft
          );
          setState(await organizerApi.loadGroupState(selectedGroupId, announcement.id));
          return announcement;
        });
      },
      updateDraft: async (patch) => {
        if (!state) return;
        const next = { ...state.announcement.draft, ...patch };
        if (isDemoMode) {
          setState({ ...state, announcement: { ...state.announcement, draft: next, reviewComplete: true } });
          return;
        }
        await run(async () => {
          const announcement = await organizerApi.updateAnnouncement(state.announcement.id, next);
          setState({ ...state, announcement });
        });
      },
      publish: async () => {
        if (!state) return;
        if (isDemoMode) {
          setState({
            ...state,
            announcement: {
              ...state.announcement,
              status: "published",
              publishedAt: new Date().toISOString()
            }
          });
          return;
        }
        await run(async () => {
          const announcement = await organizerApi.updateAnnouncement(
            state.announcement.id,
            state.announcement.draft,
            true
          );
          setState(await organizerApi.loadGroupState(state.group.id, announcement.id));
        });
      },
      updateMember: async (memberId, patch) => {
        if (!state || !isDemoMode) return;
        const now = new Date().toISOString();
        setState({
          ...state,
          group: {
            ...state.group,
            members: state.group.members.map((member) =>
              member.id === memberId
                ? {
                    ...member,
                    status: patch.status,
                    submissionUrl: patch.submissionUrl ?? member.submissionUrl,
                    blocker: patch.blocker ?? "",
                    openedAt: member.openedAt ?? now,
                    acknowledgedAt: member.acknowledgedAt ?? now,
                    completedAt: patch.status === "completed" ? now : null
                  }
                : member
            )
          }
        });
      },
      sendReminders: async (memberIds) => {
        if (!state) return;
        if (isDemoMode) return;
        await run(async () => organizerApi.prepareReminders(state.announcement.id, memberIds));
        await refresh();
      },
      refresh,
      reset: () => {
        if (!isDemoMode) return;
        setState(resetState());
      }
    }),
    [state, groups, selectedGroupId, status, error, invites, session, run, refresh]
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export const useProductState = () => {
  const value = useContext(ProductContext);
  if (!value) throw new Error("useProductState must be used inside ProductStateProvider");
  return value;
};
