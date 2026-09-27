import { checkCode, managerName, sessionCookie } from "@/lib/data";

export async function GET(request: Request) {
  return Response.json({ manager: await managerName(request) });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origine non valida" }, { status: 403 });
  const body = await request.json().catch(() => null) as { code?: unknown } | null;
  const who = await checkCode(typeof body?.code === "string" ? body.code.trim() : "");
  if (!who) return Response.json({ error: "Codice non valido" }, { status: 401 });
  const cookie = await sessionCookie(who);
  if (!cookie) return Response.json({ error: "Gestione non disponibile" }, { status: 503 });
  return Response.json({ manager: who }, { headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origine non valida" }, { status: 403 });
  return Response.json({ ok: true }, { headers: { "Set-Cookie": "dory_manager=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0" } });
}
