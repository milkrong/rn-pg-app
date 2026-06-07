import type { User } from "@supabase/supabase-js";

import { requireSupabase, supabase } from "./supabase";

export type AuthSnapshot = {
  user: User | null;
  isConfigured: boolean;
};

export async function getAuthSnapshot(): Promise<AuthSnapshot> {
  if (!supabase) {
    return { user: null, isConfigured: false };
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return { user: null, isConfigured: true };
  }

  return { user: data.user, isConfigured: true };
}

export function subscribeToAuthChanges(onChange: (user: User | null) => void) {
  if (!supabase) {
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session?.user ?? null);
  });

  return () => data.subscription.unsubscribe();
}

export async function signInWithEmail(input: { email: string; password: string }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword(input);

  if (error) {
    throw error;
  }

  return data.user;
}

export function formatAuthError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "认证失败。";
  }

  if (error.message.includes("Processing this request timed out") || error.message.includes("504")) {
    return "确认邮件发送超时，请检查 Supabase Auth 的 SMTP 配置后重试。";
  }

  if (error.message.includes("email rate limit exceeded")) {
    return "确认邮件发送太频繁，请稍后再试。";
  }

  return error.message;
}

export async function signUpWithEmail(input: { email: string; password: string }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.email.split("@")[0]
      }
    }
  });

  if (error) {
    throw error;
  }

  return {
    user: data.session ? data.user : null,
    needsEmailConfirmation: !data.session
  };
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function deleteAccount() {
  const client = requireSupabase();
  const { error } = await client.functions.invoke("delete-account", {
    body: {}
  });

  if (error) {
    throw error;
  }

  await client.auth.signOut();
}
