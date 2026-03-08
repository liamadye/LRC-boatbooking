import type { SupabaseClient } from "@supabase/supabase-js";

export function getHashAuthParams() {
  if (typeof window === "undefined") {
    return {
      accessToken: null,
      refreshToken: null,
      type: null,
      hasHash: false,
    };
  }

  const hash = window.location.hash.replace(/^#/, "");
  const hashParams = new URLSearchParams(hash);

  return {
    accessToken: hashParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token"),
    type: hashParams.get("type"),
    hasHash: hash.length > 0,
  };
}

export async function hydrateSessionFromHash(supabase: SupabaseClient) {
  const { accessToken, refreshToken, type, hasHash } = getHashAuthParams();

  if (!hasHash || !accessToken || !refreshToken) {
    return { type, hydrated: false };
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    if (error.message.includes("Lock broken by another request")) {
      return { type, hydrated: false };
    }

    throw error;
  }

  return { type, hydrated: true };
}

export function clearAuthRedirectState() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("type");
  url.hash = "";
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}
