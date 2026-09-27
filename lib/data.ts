import { env } from "cloudflare:workers";
import { offers } from "./plan";

export function db(){if(!env.DB) throw new Error("Database non disponibile");return env.DB}
export async function overview(){
  const [overrides, counts]=await Promise.all([
    db().prepare("SELECT id, capacity, note FROM slots").all<{id:string;capacity:number;note:string}>(),
    db().prepare("SELECT slot_id, SUM(people) AS confirmed FROM requests WHERE status = 'confirmed' GROUP BY slot_id").all<{slot_id:string;confirmed:number}>(),
  ]);
  const overridesMap=new Map(overrides.results.map(x=>[x.id,x]));
  const countMap=new Map(counts.results.map(x=>[x.slot_id,x.confirmed]));
  return offers.map(o=>({ ...o, capacity:overridesMap.get(o.id)?.capacity??o.defaultCapacity, note:overridesMap.get(o.id)?.note??"", confirmed:countMap.get(o.id)??0, available:Math.max(0,(overridesMap.get(o.id)?.capacity??o.defaultCapacity)-(countMap.get(o.id)??0)) }));
}
type Manager = "ric" | "peppe";
const encoder = new TextEncoder();
const cookieName = "dory_manager";

function secret(name: string): string | null {
  const value = (env as unknown as Record<string, string | undefined>)[name];
  return value && value.length >= 32 ? value : null;
}

async function sign(payload: string): Promise<string | null> {
  const key = secret("DORY_SESSION_SECRET");
  if (!key) return null;
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload)));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkCode(code: string): Promise<Manager | null> {
  const ric = secret("DORY_RIC_CODE"), peppe = secret("DORY_PEPPE_CODE");
  if (!ric || !peppe || code.length > 256) return null;
  // Both comparisons run even when the first matches.
  const isRic = same(code, ric), isPeppe = same(code, peppe);
  return isRic ? "ric" : isPeppe ? "peppe" : null;
}

export async function sessionCookie(who: Manager): Promise<string | null> {
  const payload = `${who}.${Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14}`;
  const signature = await sign(payload);
  return signature ? `${cookieName}=${payload}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1209600` : null;
}

export async function managerName(request: Request): Promise<Manager | null> {
  const raw = request.headers.get("cookie")?.split(";").map(x => x.trim()).find(x => x.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!raw) return null;
  const match = /^(ric|peppe)\.(\d{10})\.([a-f0-9]{64})$/.exec(raw);
  if (!match || Number(match[2]) < Date.now() / 1000) return null;
  const signature = await sign(`${match[1]}.${match[2]}`);
  return signature && same(signature, match[3]) ? match[1] as Manager : null;
}

export async function manager(request: Request) { return (await managerName(request)) !== null; }
