"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { acceptInvitation } from "./actions";

export function InviteConfirmation({ organizationSlug }: { organizationSlug?: string }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function accept() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      window.history.replaceState(null, "", window.location.pathname + window.location.search);

      if (hash.get("type") !== "invite" || !accessToken || !refreshToken || !organizationSlug) {
        window.location.replace("/auth/invitation-invalid");
        return;
      }

      try {
        const supabase = createClient({ detectSessionInUrl: false });
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error && await acceptInvitation(organizationSlug)) {
          window.location.replace("/auth/set-password");
          return;
        }
      } catch {
        // Failed or expired invitation; do not show internal auth errors.
      }

      window.location.replace("/auth/invitation-invalid");
    }

    void accept();
  }, [organizationSlug]);

  return null;
}
