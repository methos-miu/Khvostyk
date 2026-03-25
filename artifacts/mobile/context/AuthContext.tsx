import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<Pick<UserProfile, "name" | "avatar_url">>) => Promise<void>;
  signInWithProvider: (provider: "google" | "facebook") => Promise<{ error?: string }>;
  signInWithApple: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setIsLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
      if (data) setProfile(data as UserProfile);
    } catch { /* ignore */ } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message };

    if (data.user) {
      supabase.from("users")
        .upsert({ id: data.user.id, email: email.trim(), name })
        .then(() => {}).catch(() => {});
    }

    if (data.session) return { needsConfirmation: false };

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (!loginError) return { needsConfirmation: false };

    return { needsConfirmation: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) return { error: error.message };
    return {};
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Pick<UserProfile, "name" | "avatar_url">>) => {
    if (!user) return;
    await supabase.from("users").update(updates).eq("id", user.id);
    setProfile(prev => prev ? { ...prev, ...updates } : prev);
  }, [user]);

  const signInWithProvider = useCallback(async (provider: "google" | "facebook") => {
    try {
      const isWeb = Platform.OS === "web";
      const redirectUri = isWeb
        ? (typeof window !== "undefined" ? window.location.origin + "/" : "")
        : Linking.createURL("auth/callback");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: !isWeb,
        },
      });

      if (error) return { error: error.message };

      if (!isWeb && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        if (result.type === "success") {
          const url = new URL(result.url);
          const code = url.searchParams.get("code");
          if (code) {
            const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            if (sessionError) return { error: sessionError.message };
          }
        } else if (result.type === "cancel") {
          return { error: "cancelled" };
        }
      }

      return {};
    } catch (e: any) {
      return { error: e.message ?? "Unknown error" };
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      // expo-apple-authentication works only in real builds, not Expo Go
      // In Expo Go we show a friendly message
      const { ExpoAppleAuthenticationModule } = await import("expo-modules-core")
        .catch(() => ({ ExpoAppleAuthenticationModule: null }));

      const AppleAuthentication = await import("expo-apple-authentication")
        .catch(() => null);

      if (!AppleAuthentication) {
        return { error: "Apple Sign In доступний тільки в повній версії додатку" };
      }

      const isAvailable = await AppleAuthentication.isAvailableAsync().catch(() => false);
      if (!isAvailable) {
        return { error: "Apple Sign In недоступний на цьому пристрої" };
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { error: "No identity token from Apple" };
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });

      if (error) return { error: error.message };

      if (data.user && credential.fullName) {
        const name = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(" ");
        if (name) {
          await supabase.from("users").upsert({
            id: data.user.id,
            email: data.user.email ?? "",
            name,
          });
        }
      }

      return {};
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") return { error: "cancelled" };
      return { error: e.message ?? "Apple Sign In failed" };
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, profile, session, isLoading,
      login, register, logout, forgotPassword, updateProfile,
      signInWithProvider, signInWithApple,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}