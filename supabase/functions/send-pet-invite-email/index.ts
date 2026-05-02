// Stage 8: email invitation for non-existing users.
// This function is intentionally provider-agnostic and uses Resend-compatible API shape.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type Payload = {
  petId?: string;
  petName?: string;
  inviteeEmail?: string;
  role?: "editor" | "viewer";
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await req.json()) as Payload;
    const inviteeEmail = (body.inviteeEmail ?? "").trim().toLowerCase();
    const petName = body.petName ?? "your pet";
    const roleLabel = body.role === "editor" ? "co-owner" : "viewer";

    if (!inviteeEmail) {
      return new Response(JSON.stringify({ error: "inviteeEmail is required" }), { status: 400 });
    }

    const appLink = Deno.env.get("INVITE_APP_LINK") ?? "https://apps.apple.com/";
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("INVITE_EMAIL_FROM") ?? "VetHelper <no-reply@vethelper.app>";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Email provider is not configured" }), { status: 500 });
    }

    const text = `You were invited to become ${roleLabel} of pet "${petName}". Install/open the app: ${appLink}`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [inviteeEmail],
        subject: `Pet invitation: ${petName}`,
        text,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ error: errText }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});
