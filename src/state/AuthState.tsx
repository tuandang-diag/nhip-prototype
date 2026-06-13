import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { OrganizerSession } from "../types";
import { authApi } from "../services/backend";
import { isDemoMode } from "../services/config";
import { supabase } from "../services/supabase";

interface AuthValue {
  session: OrganizerSession | null;
  loading: boolean;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const demoSession: OrganizerSession = {
  userId: "demo-user",
  email: "lan@example.com",
  displayName: "Trần Ngọc Lan"
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<OrganizerSession | null>(isDemoMode ? demoSession : null);
  const [loading, setLoading] = useState(!isDemoMode);

  useEffect(() => {
    if (isDemoMode || !supabase) return;
    authApi.session().then(setSession).finally(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange(() => {
      authApi.session().then(setSession).finally(() => setLoading(false));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      loading,
      sendMagicLink: authApi.sendMagicLink,
      signOut: async () => {
        if (!isDemoMode) await authApi.signOut();
        setSession(isDemoMode ? demoSession : null);
      }
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
};
