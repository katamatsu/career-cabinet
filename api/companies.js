import { neon } from '@neondatabase/serverless';
import { userFromRequest } from './auth.js';

const sql = neon(process.env.DATABASE_URL);
function json(res, status, body) { res.status(status).setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); }
export default async function handler(req, res) {
  const userId = await userFromRequest(req);
  if (!userId) return json(res, 401, { error: 'ログインが必要です' });
  if (req.method === 'GET') {
    const rows = await sql`select data from companies where user_id = ${userId} order by updated_at desc`;
    return json(res, 200, { companies: rows.map((row) => row.data) });
  }
  if (req.method !== 'PUT') return json(res, 405, { error: 'Method not allowed' });
  const companies = req.body?.companies;
  if (!Array.isArray(companies) || companies.length > 200) return json(res, 400, { error: '保存できる企業数を確認してください' });
  await sql`delete from companies where user_id = ${userId}`;
  for (const company of companies) {
    if (!company?.id || !company?.name) continue;
    await sql`insert into companies (id, user_id, data, updated_at) values (${company.id}, ${userId}, ${JSON.stringify(company)}, now())`;
  }
  return json(res, 200, { companies });
}
