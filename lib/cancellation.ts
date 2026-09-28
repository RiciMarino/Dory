import { env } from "cloudflare:workers";
import { db } from "./data";
import { offers } from "./plan";

type Booking = { id:string; slot_id:string; name:string; email:string; people:number; status:string; cancellation_sent_at:string|null };

export async function sendCancellation(id:string):Promise<{sent:boolean;error?:string}> {
  const row=await db().prepare("SELECT id,slot_id,name,email,people,status,cancellation_sent_at FROM requests WHERE id=?").bind(id).first<Booking>();
  if(!row||row.status!=="cancelled")return {sent:false,error:"Prenotazione non cancellata"};
  if(row.cancellation_sent_at)return {sent:true};
  const slot=offers.find(x=>x.id===row.slot_id);
  const config=env as unknown as Record<string,string|undefined>;
  if(!slot||!config.DORY_CONFIRMATION_WEBAPP_URL||!config.DORY_CONFIRMATION_TOKEN)return {sent:false,error:"Notifica non configurata"};
  try {
    const response=await fetch(config.DORY_CONFIRMATION_WEBAPP_URL,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({type:"cancellation",token:config.DORY_CONFIRMATION_TOKEN,id:row.id,name:row.name,email:row.email,people:row.people,offer:`${slot.title} · ${slot.dates} (${slot.week})`}),
      signal:AbortSignal.timeout(20000),
    });
    const result=await response.json() as {ok?:boolean};
    if(!response.ok||!result.ok)throw Error("Invio non confermato");
    await db().prepare("UPDATE requests SET cancellation_sent_at=? WHERE id=? AND status='cancelled'").bind(new Date().toISOString(),id).run();
    return {sent:true};
  } catch {
    return {sent:false,error:"Notifica non inviata. Riprova dal report."};
  }
}
