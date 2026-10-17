import { hashPassword } from "../auth";
import { isUniqueViolation, query } from "./postgres";
import type { AdminRole } from "../../types";

export class DuplicateUserError extends Error {
  constructor() { super("این شماره موبایل قبلاً ثبت شده است"); this.name = "DuplicateUserError"; }
}

export async function listUsers() {
  const { rows } = await query(
    `SELECT id, phone, full_name, role, is_active, created_at, last_login_at
     FROM admins
     ORDER BY created_at DESC, id DESC`,
  );
  return rows.map((row) => ({
    id: row.id as string,
    phone: row.phone as string,
    fullName: row.full_name as string | null,
    role: row.role as AdminRole,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at).toISOString(),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
  }));
}

export async function createUser(input: { phone: string; fullName: string; password: string; role: AdminRole }) {
  const passwordHash = await hashPassword(input.password);
  try {
    const { rows } = await query(
      `INSERT INTO admins(phone, full_name, password_hash, role, is_active)
       VALUES($1, $2, $3, $4, true)
       RETURNING id, phone, full_name, role, is_active, created_at`,
      [input.phone, input.fullName, passwordHash, input.role],
    );
    const row = rows[0];
    return { id: row.id, phone: row.phone, fullName: row.full_name, role: row.role, isActive: row.is_active, createdAt: row.created_at };
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateUserError();
    throw error;
  }
}
