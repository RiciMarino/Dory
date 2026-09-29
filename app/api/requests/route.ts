import { db, manager, overview } from "@/lib/data";
import { offers } from "@/lib/plan";
import { notifyManagers } from "@/lib/notifications";
import { env, waitUntil } from "cloudflare:workers";
const dailyWindows:Record<string,[string,string]>={
  "feb-day":["2027-02-15","2027-02-21"],
  "sep-day":["2027-09-20","2027-09-23"]
};
function validSailDate(slotId:string,value:string){
  if(!value)return true;
  const window=dailyWindows[slotId];
  return Boolean(window&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value&&value>=window[0]&&value<=window[1]);
}
export async function GET(request:Request){
  if(!await manager(request)) return Response.json({error:"Accesso riservato"},{status:403});
  try {const result=await db().prepare("SELECT id,slot_id,name,email,people,message,sail_date,status,added_by,created_at,confirmation_sent_at,confirmation_sent_to,cancellation_sent_at FROM requests ORDER BY created_at DESC").all();return Response.json({requests:result.results})}
  catch{return Response.json({error:"Richieste non disponibili"},{status:503})}
}
export async function POST(request:Request){
  try{
    const config=env as unknown as Record<string,string|undefined>;
    if(!config.DORY_CONFIRMATION_WEBAPP_URL||!config.DORY_CONFIRMATION_TOKEN||config.DORY_CONFIRMATION_TOKEN.length<32)
      return Response.json({error:"Le richieste saranno disponibili a breve. Riprova più tardi."},{status:503});
    const body=await request.json() as Record<string,unknown>;
    const slotId=String(body.slotId??""); const name=String(body.name??"").trim(); const email=String(body.email??"").trim().toLowerCase();const message=String(body.message??"").trim();const people=Number(body.people);const sailDate=String(body.sailDate??"").trim();
    const requestId=typeof body.requestId==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId)?body.requestId:crypto.randomUUID();
    if(!offers.some(o=>o.id===slotId)||name.length<2||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||!Number.isInteger(people)||people<1||people>6||message.length>500||!validSailDate(slotId,sailDate))return Response.json({error:"Controlla i dati inseriti"},{status:400});
    const slot=(await overview()).find(x=>x.id===slotId)!;
    if(slot.capacity===0)return Response.json({error:"Questa proposta non è ancora aperta"},{status:409});
    if(slot.kind!=="party"&&people>slot.available)return Response.json({error:"I posti richiesti superano quelli disponibili"},{status:409});
    await db().prepare("INSERT OR IGNORE INTO requests(id,slot_id,name,email,people,message,sail_date,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(requestId,slotId,name,email,people,message,sailDate||null,"pending",new Date().toISOString()).run();
    waitUntil(notifyManagers(requestId));
    return Response.json({ok:true,message:"Richiesta registrata: Riccardo e Peppe la valuteranno."},{status:201});
  }catch{return Response.json({error:"Non siamo riusciti a registrare la richiesta"},{status:503})}
}
