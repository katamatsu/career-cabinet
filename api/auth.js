import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const sql = neon(process.env.DATABASE_URL);
const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const cookieName = 'career_cabinet_session';

function cookie(value, maxAge) {
  return `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function json(res, status, body, headers = {}) { res.status(status).setHeader('Content-Type', 'application/json'); Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value)); res.end(JSON.stringify(body)); }
async function tokenFor(userId) { return new SignJWT({ sub: userId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(secret); }
export async function userFromRequest(req) {
  const value = (req.headers.cookie || '').split(';').map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`))?.split('=')[1];
  if (!value) return null;
  try { const { payload } = await jwtVerify(value, secret); return payload.sub || null; } catch { return null; }
}
export default async function handler(req, res) {
  if (req.method === 'GET') return json(res, 200, { authenticated: Boolean(await userFromRequest(req)) });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const { action, email, password } = req.body || {};
  if (!email || !password || password.length < 8) return json(res, 400, { error: 'メールアドレスと8文字以上のパスワードが必要です' });
  const normalizedEmail = email.trim().toLowerCase();
  if (action === 'register') {
    const existing = await sql`select id from users where email = ${normalizedEmail}`;
    if (existing.length) return json(res, 409, { error: 'このメールアドレスは登録済みです' });
    const hash = await bcrypt.hash(password, 12);
    const rows = await sql`insert into users (email, password_hash) values (${normalizedEmail}, ${hash}) returning id, email`;
    const token = await tokenFor(rows[0].id);
    return json(res, 201, { email: rows[0].email }, { 'Set-Cookie': cookie(token, 60 * 60 * 24 * 7) });
  }
  if (action === 'login') {
    const rows = await sql`select id, email, password_hash from users where email = ${normalizedEmail}`;
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) return json(res, 401, { error: 'メールアドレスまたはパスワードが違います' });
    const token = await tokenFor(rows[0].id);
    return json(res, 200, { email: rows[0].email }, { 'Set-Cookie': cookie(token, 60 * 60 * 24 * 7) });
  }
  if (action === 'logout') return json(res, 200, {}, { 'Set-Cookie': cookie('', 0) });
  return json(res, 400, { error: 'Unknown action' });
}
