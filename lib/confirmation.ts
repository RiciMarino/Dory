import { env } from "cloudflare:workers";
import { db } from "./data";
import { offers } from "./plan";

type Booking = { id: string; slot_id: string; name: string; email: string; people: number; status: string; added_by: string; confirmation_sent_to: string | null };

async function gateway(payload: Record<string, unknown>): Promise<{sent: boolean; error?: string}> {
  const config = env as unknown as Record<string, string | undefined>;
  const endpoint = config.DORY_CONFIRMATION_WEBAPP_URL;
  const token = config.DORY_CONFIRMATION_TOKEN;
  if (!endpoint || !token) return { sent: false, error: "Invio email non ancora configurato" };
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, ...payload }),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json() as {ok?: boolean};
    if (!response.ok || !result.ok) throw new Error("Invio non confermato");
    return { sent: true };
  } catch {
    return { sent: false, error: "Email non inviata. Puoi riprovare dal report." };
  }
}

export async function notifyManagersOfConfirmedBooking(id: string): Promise<{sent: boolean; error?: string}> {
  const row = await db().prepare("SELECT id,slot_id,name,email,people,status,added_by,confirmation_sent_to FROM requests WHERE id=?").bind(id).first<Booking>();
  if (!row || row.status !== "confirmed") return { sent: false, error: "Prenotazione non confermata" };
  const slot = offers.find(x => x.id === row.slot_id);
  if (!slot) return { sent: false, error: "Uscita non trovata" };
  return gateway({
    type: "manager-confirmation",
    id: row.id,
    name: row.name,
    email: row.email,
    people: row.people,
    addedBy: row.added_by,
    offer: `${slot.title} · ${slot.dates} (${slot.week})`,
  });
}

export async function sendConfirmation(id: string): Promise<{sent: boolean; error?: string}> {
  const row = await db().prepare("SELECT id,slot_id,name,email,people,status,added_by,confirmation_sent_to FROM requests WHERE id=?").bind(id).first<Booking>();
  if (!row || row.status !== "confirmed") return { sent: false, error: "Prenotazione non confermata" };
  if (!row.email) return { sent: false, error: "Aggiungi un indirizzo email prima dell’invio" };
  if (row.confirmation_sent_to === row.email) return { sent: true };
  const slot = offers.find(x => x.id === row.slot_id);
  if (!slot) return { sent: false, error: "Uscita non trovata" };
  const result = await gateway({type:"confirmation",id:row.id,name:row.name,email:row.email,people:row.people,offer:`${slot.title} · ${slot.dates} (${slot.week})`});
  if (result.sent) {
    await db().prepare("UPDATE requests SET confirmation_sent_at=?, confirmation_sent_to=? WHERE id=? AND status='confirmed'").bind(new Date().toISOString(),row.email,row.id).run();
  }
  return result;
}
