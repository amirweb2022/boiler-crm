import { hashPassword } from "../auth";
import { isUniqueViolation, query } from "./postgres";
import type { AdminRole } from "../../types";

export class DuplicateUserError extends Error {
  constructor() { super("این شماره موبایل قبلاً ثبت شده است"); this.name = "DuplicateUserError"; }
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
