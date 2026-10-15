import { config } from "dotenv";
config({ path: ".env.local" });

import { query } from "../lib/db/postgres";
import { hashPassword } from "../lib/auth";

const STRONG_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const VALID_ROLES = ["admin", "tester"];

async function main() {
  const [, , phone, password, fullName, roleArg] = process.argv;
  const role = roleArg ?? "admin";
  if (!phone || !password) {
    console.error('Usage: npx tsx --env-file=.env.local scripts/create-admin.ts <phone> <password> ["name"] [admin|tester]');
    process.exit(1);
  }
  if (!/^09\d{9}$/.test(phone)) { console.error("Phone must use the format 09xxxxxxxxx"); process.exit(1); }
  if (!STRONG_PASSWORD_REGEX.test(password)) { console.error("Password must be at least 8 characters and contain a letter and a number"); process.exit(1); }
  if (!VALID_ROLES.includes(role)) { console.error(`Role must be one of: ${VALID_ROLES.join(", ")}`); process.exit(1); }

  const passwordHash = await hashPassword(password);
  const { rows } = await query(`INSERT INTO admins(phone,password_hash,full_name,role) VALUES($1,$2,$3,$4) RETURNING id,phone`, [phone,passwordHash,fullName??null,role]);
  console.log(`Admin created (${role}):`, rows[0].id, rows[0].phone);
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
