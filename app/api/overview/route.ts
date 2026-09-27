import { overview } from "@/lib/data";
export async function GET(){try{return Response.json({offers:await overview()})}catch{return Response.json({error:"Calendario temporaneamente non disponibile"},{status:503})}}
