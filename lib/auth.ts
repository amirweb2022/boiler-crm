import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "./supabase/server";
import type { Admin } from "../types";

const SESSION_COOKIE = "boiler_crm_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // ۸ ساعت

function getJwtSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET تنظیم نشده یا خیلی کوتاه است (حداقل ۱۶ کاراکتر)");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

interface SessionPayload {
  adminId: string;
  phone: string;
}

export async function createSession(admin: Pick<Admin, "id" | "phone">) {
  const token = await new SignJWT({ adminId: admin.id, phone: admin.phone } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getJwtSecret());

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  cookies().delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<Admin> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");

  const db = getSupabaseServerClient();
  const { data, error } = await db.from("admins").select("*").eq("id", session.adminId).single();
  if (error || !data || !data.is_active) throw new Error("UNAUTHORIZED");

  return {
    id: data.id,
    phone: data.phone,
    fullName: data.full_name,
    role: data.role,
    isActive: data.is_active,
    createdAt: data.created_at,
    lastLoginAt: data.last_login_at,
  };
}

export class ForbiddenError extends Error {
  constructor(message = "شما اجازه انجام این عملیات را ندارید") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * احراز هویت + بررسی نقش. برای عملیات حساس (ساخت/ویرایش/حذف شرکت و
 * مخزن، ثبت انجام، آپلود گواهی) استفاده می‌شود تا نقش «tester» که فقط
 * باید بتواند تیک مخازن را بزند، از این عملیات‌ها منع شود — این بررسی
 * همیشه سمت سرور تکرار می‌شود، نه فقط با مخفی‌کردن دکمه در UI.
 */
export async function requireRole(...allowedRoles: Admin["role"][]): Promise<Admin> {
  const admin = await requireAdmin();
  if (!allowedRoles.includes(admin.role)) {
    throw new ForbiddenError();
  }
  return admin;
}
