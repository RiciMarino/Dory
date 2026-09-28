import { env } from "cloudflare:workers";
import { db } from "./data";
import { offers } from "./plan";

type Booking = { id: string; slot_id: string; name: string; email: string; people: number; message: string; status: string };

export async function notifyManagers(id: string): Promise<void> {
  const row = await db().prepare("SELECT id,slot_id,name,email,people,message,status FROM requests WHERE id=?").bind(id).first<Booking>();
  if (!row || row.status !== "pending") return;
  const slot = offers.find(x => x.id === row.slot_id);
  const config = env as unknown as Record<string, string | undefined>;
  if (!slot || !config.DORY_CONFIRMATION_WEBAPP_URL || !config.DORY_CONFIRMATION_TOKEN) return;
  try {
    const response = await fetch(config.DORY_CONFIRMATION_WEBAPP_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "new-request", token: config.DORY_CONFIRMATION_TOKEN,
        id: row.id, name: row.name, email: row.email, people: row.people,
        message: row.message, offer: `${slot.title} · ${slot.dates} (${slot.week})`,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
  } catch (error) {
    console.error("Dory manager notification failed", error);
  }
}
