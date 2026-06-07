import 'dotenv/config';
import crypto from 'node:crypto';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');

try {
  const password = hashPassword('sinemadubes.anakhebat');

  const r = await pool.query(
    `UPDATE users SET username = $1, email = $1, password = $2, role = $3, name = $4 WHERE id = 4 RETURNING id, username, email, role, name`,
    ['dutophy@gmail.com', password, 'ketua', 'Admin Dutophy']
  );

  console.log('✅ Credentials updated!');
  console.log(JSON.stringify(r.rows[0], null, 2));

  // Verify by generating and checking the same hash
  const verifyHash = crypto.createHash('sha256').update('sinemadubes.anakhebat').digest('hex');
  console.log(`\nPassword hash matches: ${password === verifyHash}`);

  await pool.end();
} catch (e) {
  console.error('Error:', e.message);
  await pool.end();
}