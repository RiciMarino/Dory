import { db, manager, managerName, overview } from "@/lib/data";
import { offers } from "@/lib/plan";
import { sendConfirmation } from "@/lib/confirmation";
import { sendCancellation } from "@/lib/cancellation";
export async function POST(request:Request){
  if(!await manager(request)) return Response.json({error:"Accesso riservato"},{status:403});
  if(request.headers.get("origin")!==new URL(request.url).origin) return Response.json({error:"Origine non valida"},{status:403});
  try{
    const body=await request.json() as Record<string,unknown>;
    if(body.action==="add"){
      const slotId=String(body.slotId??"");const name=String(body.name??"").trim();const email=String(body.email??"").trim().toLowerCase();const people=Number(body.people);const addedBy=await managerName(request);const message=String(body.message??"").trim();
      const slot=(await overview()).find(x=>x.id===slotId);
      if(!slot||name.length<2||name.length>100||(email!==""&&!/^\S+@\S+\.\S+$/.test(email))||!Number.isInteger(people)||people<1||people>6||!addedBy||message.length>500)return Response.json({error:"Controlla i dati dell'equipaggio"},{status:400});
      if(slot.kind!=="party"&&people>slot.available)return Response.json({error:"Non ci sono abbastanza posti liberi"},{status:409});
      const id=crypto.randomUUID();
      await db().prepare("INSERT INTO requests(id,slot_id,name,email,people,message,status,added_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(id,slotId,name,email,people,message,"confirmed",addedBy,new Date().toISOString()).run();
      const confirmation=body.sendConfirmation===true?await sendConfirmation(id):null;
      return Response.json({ok:true,confirmation});
    }
    if(body.action==="capacity"){
      const slotId=String(body.slotId??"");const capacity=Number(body.capacity);const note=String(body.note??"").trim();
      if(!offers.some(x=>x.id===slotId)||!Number.isInteger(capacity)||capacity<0||capacity>6||note.length>300)return Response.json({error:"Valori non validi"},{status:400});
      const existing=(await overview()).find(x=>x.id===slotId)!;
      if(capacity<existing.confirmed)return Response.json({error:"Prima libera i posti già confermati"},{status:409});
      await db().prepare("INSERT INTO slots(id,capacity,note) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET capacity=excluded.capacity,note=excluded.note").bind(slotId,capacity,note).run();
      return Response.json({ok:true});
    }
    if(body.action==="status"){
      const id=String(body.id??"");const status=String(body.status??"");
      if(!["confirmed","pending","declined"].includes(status))return Response.json({error:"Stato non valido"},{status:400});
      const row=await db().prepare("SELECT slot_id,people,status FROM requests WHERE id=?").bind(id).first<{slot_id:string;people:number;status:string}>();
      if(!row)return Response.json({error:"Richiesta non trovata"},{status:404});
      if(status==="confirmed"&&row.status!=="confirmed"){
        const slot=(await overview()).find(x=>x.id===row.slot_id)!;
        if(slot.kind!=="party"&&row.people>slot.available)return Response.json({error:"Non ci sono abbastanza posti liberi"},{status:409});
      }
      await db().prepare("UPDATE requests SET status=? WHERE id=?").bind(status,id).run();
      const confirmation=status==="confirmed"&&row.status!=="confirmed"?await sendConfirmation(id):null;
      return Response.json({ok:true,confirmation});
    }
    if(body.action==="edit"){
      const id=String(body.id??"");const name=String(body.name??"").trim();const email=String(body.email??"").trim().toLowerCase();const people=Number(body.people);const message=String(body.message??"").trim();
      if(name.length<2||name.length>100||(email!==""&&!/^\S+@\S+\.\S+$/.test(email))||!Number.isInteger(people)||people<1||people>6||message.length>500)return Response.json({error:"Controlla nome, email, persone e note"},{status:400});
      const row=await db().prepare("SELECT slot_id,people,status FROM requests WHERE id=?").bind(id).first<{slot_id:string;people:number;status:string}>();
      if(!row||row.status==="cancelled")return Response.json({error:"Prenotazione non trovata"},{status:404});
      if(row.status==="confirmed"&&people>row.people){const slot=(await overview()).find(x=>x.id===row.slot_id)!;if(slot.kind!=="party"&&people-row.people>slot.available)return Response.json({error:"Non ci sono abbastanza posti liberi"},{status:409})}
      await db().prepare("UPDATE requests SET name=?,email=?,people=?,message=?,confirmation_sent_at=CASE WHEN email=? THEN confirmation_sent_at ELSE NULL END,confirmation_sent_to=CASE WHEN email=? THEN confirmation_sent_to ELSE NULL END WHERE id=?").bind(name,email,people,message,email,email,id).run();return Response.json({ok:true});
    }
    if(body.action==="cancel"){
      const id=String(body.id??"");const row=await db().prepare("SELECT id,status FROM requests WHERE id=?").bind(id).first<{id:string;status:string}>();
      if(!row)return Response.json({error:"Prenotazione non trovata"},{status:404});
      if(row.status!=="cancelled")await db().prepare("UPDATE requests SET status='cancelled' WHERE id=?").bind(id).run();
      const cancellation=await sendCancellation(id);
      return Response.json({ok:true,cancellation});
    }
    if(body.action==="send-cancellation"){
      const cancellation=await sendCancellation(String(body.id??""));
      return Response.json({ok:true,cancellation});
    }
    if(body.action==="send-confirmation"){
      const result=await sendConfirmation(String(body.id??""));
      return Response.json({ok:true,confirmation:result});
    }
    return Response.json({error:"Azione non valida"},{status:400});
  }catch{return Response.json({error:"Modifica non riuscita"},{status:503})}
}
