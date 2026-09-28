import { env } from "cloudflare:workers";
import { db } from "@/lib/data";

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function GET(request: Request) {
  const token = (env as unknown as Record<string, string | undefined>).DORY_CONFIRMATION_TOKEN;
  const provided = request.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  if (!token || token.length < 32 || !same(provided, token)) {
    return Response.json({ error: "Accesso riservato" }, { status: 403 });
  }
  try {
    const result = await db().prepare(
      "SELECT id, slot_id, name, email, people, added_by FROM requests WHERE status='confirmed' ORDER BY created_at, id"
    ).all();
    return Response.json({ bookings: result.results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Dati non disponibili" }, { status: 503 });
  }
}
