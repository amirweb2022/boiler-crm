import { query } from "./db/postgres";

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

export async function isLoginRateLimited(phone:string,_ip:string|null):Promise<boolean> {
  try {
    const windowStart=new Date(Date.now()-WINDOW_MINUTES*60*1000);
    const {rows}=await query(`SELECT count(*)::text AS count FROM login_attempts WHERE phone=$1 AND success=false AND created_at >= $2`,[phone,windowStart]);
    return Number(rows[0]?.count??0)>=MAX_FAILED_ATTEMPTS;
  } catch(error:any) {
    console.error("Failed to check login rate limit:",error.message);
    return false;
  }
}

export async function recordLoginAttempt(phone:string,ip:string|null,success:boolean):Promise<void> {
  try { await query(`INSERT INTO login_attempts(phone,ip_address,success) VALUES($1,$2,$3)`,[phone,ip,success]); }
  catch(error) { console.error("Failed to record login attempt:",error); }
}

export function getClientIp(req:Request):string|null {
  const forwarded=req.headers.get("x-forwarded-for");
  if(forwarded)return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
