// ─── CRITICAL: Load environment variables FIRST ─────────────────────────────
import 'dotenv/config';
import crypto from 'node:crypto';

// ─── Boot diagnostic: verify critical env vars are available ─────────────
// NOTE: All env vars MUST be read via bracket notation process.env['KEY']
// to prevent any compile-time evaluation by Node.js/bundlers.
const BLOB_TOKEN = process.env['BLOB_READ_WRITE_TOKEN'];
const DB_URL = process.env['DATABASE_URL'];
const PORT_VAL = process.env['PORT'] || '3001 (default)';
const GOOGLE_CLIENT_ID = process.env['GOOGLE_CLIENT_ID'];
const GOOGLE_CLIENT_SECRET = process.env['GOOGLE_CLIENT_SECRET'];
console.log('🚀 [Server Boot] Environment check:');
console.log('   BLOB_READ_WRITE_TOKEN:', BLOB_TOKEN ? `SET (length: ${BLOB_TOKEN.length})` : '❌ NOT SET');
console.log('   DATABASE_URL:', DB_URL ? 'SET' : '❌ NOT SET');
console.log('   PORT:', PORT_VAL);
console.log('   GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? `SET (${GOOGLE_CLIENT_ID.substring(0, 20)}...)` : '❌ NOT SET');
console.log('   GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? 'SET' : '❌ NOT SET');
// Dump all env keys matching known patterns to aid debugging
console.log('🔍 Env keys matching *BLOB*, *TOKEN*, *VERCEL*, *GOOGLE*:', 
  Object.keys(process.env).filter(k => /BLOB|TOKEN|VERCEL|GOOGLE/i.test(k)).join(', ') || '(none found)');
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { OAuth2Client } from 'google-auth-library';
import { eq, desc, asc, and, gte, lte, like } from 'drizzle-orm';
import { db } from './db.js';
import { users, transactions, members, attendance, cashRecords, approvals, auditLogs, config, categories } from './schema.js';
import { createAuditLog, extractClientInfo } from './auditLog.js';
import { uploadToVercelBlob } from './upload.js';

const app = new Hono();

// Google OAuth2 client — reads GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from env
console.log('🔧 Initializing Google OAuth client...');
const googleClientId = process.env['GOOGLE_CLIENT_ID'];
const googleClientSecret = process.env['GOOGLE_CLIENT_SECRET'];

console.log('🔧 Google Client ID from env:', googleClientId ? `${googleClientId.substring(0, 20)}...` : '❌ NOT SET');
console.log('🔧 Google Client Secret from env:', googleClientSecret ? 'SET' : '❌ NOT SET');

// Warning if Google OAuth is not configured
if (!googleClientId || !googleClientSecret) {
  console.warn('⚠️  WARNING: Google OAuth is not fully configured!');
  console.warn('⚠️  Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in:');
  console.warn('⚠️  - Local: apps/api/.env');
  console.warn('⚠️  - Production: Render environment variables');
  console.warn('⚠️  Google OAuth login will fail until these are configured.');
}

const googleClient = new OAuth2Client(
  googleClientId || '',
  googleClientSecret || '',
);

console.log('🔧 Google OAuth client initialized:', googleClient ? 'YES' : 'NO');

app.onError((err, c) => {
  console.error('Unhandled request error:', err);
  return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
});

const tokenStore = new Map();

const createToken = () => `token-${crypto.randomBytes(16).toString('hex')}`;

const hashPassword = (password) => {
  if (!password) {
    throw new Error('Password cannot be null or empty');
  }
  return crypto.createHash('sha256').update(password).digest('hex');
};

const verifyPassword = (password, hash) => {
  if (!password || !hash) {
    return false;
  }
  try {
    return hashPassword(password) === hash;
  } catch (err) {
    console.error('Error in verifyPassword:', err);
    return false;
  }
};

const getUserFromToken = async (authorization) => {
  if (!authorization) return null;
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;
  const username = tokenStore.get(token);

  // Token not found in in-memory store — reject instead of falling back to first user.
  // The insecure fallback was removed: it granted access to row[0] after a server restart,
  // effectively bypassing authentication entirely.
  if (!username) {
    return null;
  }

  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return rows[0] || null;
};

const ensureDemoAdmin = async () => {
  try {
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length === 0) {
      await db.insert(users).values({
        username: 'dutophy@gmail.com',
        password: hashPassword('sinemadubes.anakhebat'),
        role: 'ketua',
        name: 'Admin Dutophy',
        email: 'dutophy@gmail.com',
      });
      console.log('Demo admin user created: dutophy@gmail.com / sinemadubes.anakhebat');
    }
  } catch (err) {
    console.error('Demo admin seed failed:', err);
  }
};

await ensureDemoAdmin();

// Simplified and robust CORS configuration
app.use('*', cors({
  origin: [
    'https://dutophy.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  exposeHeaders: ['Content-Length', 'X-Response-Time'],
  maxAge: 86400, // 24 hours
}));

// Add logging middleware for CORS debugging
app.use('*', async (c, next) => {
  const origin = c.req.header('origin');
  console.log(`🌐 CORS Request - Origin: ${origin || '(none)'}, Method: ${c.req.method}, Path: ${c.req.path}`);
  await next();
});

// Enhanced OPTIONS handler for preflight requests
app.options('*', (c) => {
  const origin = c.req.header('origin');
  const allowedOrigin = [
    'https://dutophy.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
  ].includes(origin) ? origin : 'https://dutophy.vercel.app';
  
  console.log(`🌐 OPTIONS Preflight - Origin: ${origin || '(none)'}, Method: ${c.req.method}`);
  
  c.header('Access-Control-Allow-Origin', allowedOrigin);
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Max-Age', '86400');
  
  return c.text('ok', 200);
});

// Enhanced health check endpoint with database verification
app.get('/health', async (c) => {
  const health = {
    ok: true,
    timestamp: new Date().toISOString(),
    environment: {
      googleOAuth: !!(process.env['GOOGLE_CLIENT_ID'] && process.env['GOOGLE_CLIENT_SECRET']),
      database: false,
    }
  };

  // Test database connection
  try {
    const result = await db.execute('SELECT 1 as test');
    health.environment.database = true;
  } catch (err) {
    console.error('Health check - database error:', err.message);
    health.ok = false;
    health.environment.database = false;
    health.error = 'Database connection failed';
  }

  return c.json(health, health.ok ? 200 : 503);
});

// ─── Check if email already exists (for passcode gating) ─────────────────────
app.post('/api/auth/check-email', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: 'Email wajib diisi' }, 400);
    }

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return c.json({ exists: rows.length > 0 });
  } catch (err) {
    console.error('❌ Check-email endpoint error:', err);
    return c.json({ error: err.message || 'Internal server error' }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return c.json({ error: 'Username and password required' }, 400);
    }

    console.log(`🔐 Login attempt for user: ${username}`);
    
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const user = rows[0];

    // First check if user exists
    if (!user) {
      console.log(`❌ User not found: ${username}`);
      const { ipAddress, userAgent } = extractClientInfo(c);
      await createAuditLog({
        username: username || 'unknown',
        action: 'LOGIN_FAILED',
        targetType: 'USER',
        targetId: null,
        description: 'Failed login attempt - user not found',
        ipAddress,
        userAgent,
      });
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Guard: Users with no password (Google OAuth) cannot log in with password
    if (!user.password) {
      console.log(`❌ Google OAuth user attempting password login: ${username}`);
      return c.json({ error: 'Akun ini terdaftar menggunakan Google. Silakan login menggunakan tombol Google.' }, 403);
    }

    // Now safe to verify password (we know user exists and has a password)
    if (!verifyPassword(password, user.password)) {
      console.log(`❌ Invalid password for user: ${username}`);
      const { ipAddress, userAgent } = extractClientInfo(c);
      await createAuditLog({
        username: username || 'unknown',
        action: 'LOGIN_FAILED',
        targetType: 'USER',
        targetId: user.id,
        description: 'Failed login attempt - invalid password',
        ipAddress,
        userAgent,
      });
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Check if account is deactivated
    if (user.status === 'alumni') {
      const { ipAddress, userAgent } = extractClientInfo(c);
      await createAuditLog({
        username: username || 'unknown',
        action: 'LOGIN_FAILED',
        targetType: 'USER',
        targetId: user?.id || null,
        description: 'Deactivated account login attempt',
        ipAddress,
        userAgent,
      });
      return c.json({ error: 'Akun Anda telah dinonaktifkan. Silakan hubungi Ketua.' }, 403);
    }

    const token = createToken();
    tokenStore.set(token, user.username);

    // Log successful login
    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'LOGIN',
      targetType: 'USER',
      targetId: user.id,
      description: `User ${user.username} logged in`,
      ipAddress,
      userAgent,
    });

    console.log(`✅ Login successful for user: ${username}, role: ${user.role}`);
    
    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email || '',
        avatarUrl: user.avatarUrl || '',
      },
    });
  } catch (err) {
    console.error('❌ Login endpoint error:', err);
    console.error('❌ Error name:', err.name);
    console.error('❌ Error message:', err.message);
    console.error('❌ Error stack:', err.stack);
    
    return c.json({ 
      success: false,
      error: 'Internal server error during authentication',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, 500);
  }
});

app.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password, name, email } = body;

    if (!username || !password) {
      return c.json({ error: 'Username dan password wajib diisi' }, 400);
    }

    console.log(`📝 Register attempt for user: ${username}`);

    const existingByUsername = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existingByUsername.length > 0) {
      return c.json({ error: 'Email sudah terdaftar' }, 409);
    }

    // Check if email already exists (prevents duplicate registration across Google/manual)
    if (email) {
      const existingByEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingByEmail.length > 0) {
        return c.json({ error: 'Email sudah terdaftar. Silakan gunakan Login dengan Google atau masuk dengan email tersebut.' }, 409);
      }
    }

    const newUser = {
      username,
      password: hashPassword(password),
      role: 'pending', // Must be approved by admin before accessing dashboard
      name: name || username,
      email: email || '',
    };

    const inserted = await db.insert(users).values(newUser).returning();
    const createdUser = inserted[0];
    const token = createToken();
    tokenStore.set(token, createdUser.username);

    console.log(`✅ User registered successfully: ${username}`);

    return c.json({
      success: true,
      token,
      user: {
        id: createdUser.id,
        username: createdUser.username,
        role: createdUser.role,
        name: createdUser.name,
        email: createdUser.email || '',
      },
    });
  } catch (err) {
    console.error('❌ Register endpoint error:', err);
    console.error('❌ Error message:', err.message);
    console.error('❌ Error stack:', err.stack);
    
    return c.json({ 
      success: false,
      error: 'Internal server error during registration',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, 500);
  }
});

app.get('/api/auth/me', async (c) => {
  const user = await getUserFromToken(c.req.header('authorization'));
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return c.json({ success: true, user: {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    email: user.email || '',
    avatarUrl: user.avatarUrl || '',
  } });
});

// ─── Google OAuth Login ─────────────────────────────────────────────────────
app.post('/api/auth/google', async (c) => {
  try {
    const body = await c.req.json();
    const { credential } = body;

    if (!credential) {
      return c.json({ success: false, error: 'Google credential is required' }, 400);
    }

    // ─── STRICT ENV GUARD: Check for required Google OAuth configuration ────
    // Try both Hono context env (Cloudflare Workers) and process.env (Node.js)
    const googleClientId = c.env?.GOOGLE_CLIENT_ID || process.env['GOOGLE_CLIENT_ID'];
    const googleClientSecret = c.env?.GOOGLE_CLIENT_SECRET || process.env['GOOGLE_CLIENT_SECRET'];
    
    console.log(`🔐 Google OAuth - Client ID: ${googleClientId ? 'SET' : '❌ MISSING'}`);
    console.log(`🔐 Google OAuth - Client Secret: ${googleClientSecret ? 'SET' : '❌ MISSING'}`);
    console.log(`🔐 Google OAuth - Credential length: ${credential.length}`);
    
    // Critical configuration check
    if (!googleClientId) {
      console.error('❌ CRITICAL: GOOGLE_CLIENT_ID is not set in environment variables');
      console.error('❌ Check: 1) apps/api/.env file, 2) Render environment variables');
      return c.json({ 
        success: false,
        error: 'Configuration Error: Backend GOOGLE_CLIENT_ID is missing on the server.',
        hint: 'Please contact the administrator to configure Google OAuth credentials.'
      }, 500);
    }
    
    if (!googleClientSecret) {
      console.error('❌ CRITICAL: GOOGLE_CLIENT_SECRET is not set in environment variables');
      return c.json({ 
        success: false,
        error: 'Configuration Error: Backend GOOGLE_CLIENT_SECRET is missing on the server.',
        hint: 'Please contact the administrator to configure Google OAuth credentials.'
      }, 500);
    }

    // Verify the Google ID token server-side
    console.log(`🔐 Attempting to verify Google token...`);
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      return c.json({ error: 'Invalid Google token: missing user info' }, 400);
    }

    const { sub: googleId, email, name, picture } = payload;

    // 1. Check if a user already exists with this googleId
    console.log(`🔍 Checking for existing user with Google ID: ${googleId}`);
    let existingByGoogleId = [];
    try {
      existingByGoogleId = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    } catch (dbErr) {
      console.error('❌ Database query error (googleId lookup):', dbErr);
      throw new Error(`Database error: ${dbErr.message}`);
    }
    
    if (existingByGoogleId.length > 0) {
      // User already linked — log them in
      const user = existingByGoogleId[0];
      console.log(`✅ Found existing user: ${user.username} (ID: ${user.id})`);
      
      const token = createToken();
      tokenStore.set(token, user.username);

      const { ipAddress, userAgent } = extractClientInfo(c);
      await createAuditLog({
        userId: user.id,
        username: user.username,
        action: 'LOGIN',
        targetType: 'USER',
        targetId: user.id,
        description: `User ${user.username} logged in via Google OAuth`,
        ipAddress,
        userAgent,
      });

      return c.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email || '',
          avatarUrl: user.avatarUrl || '',
        },
      });
    }

    // 2. Check if a user already exists with this email (account linking)
    console.log(`🔍 Checking for existing user with email: ${email}`);
    let existingByEmail = [];
    try {
      existingByEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
    } catch (dbErr) {
      console.error('❌ Database query error (email lookup):', dbErr);
      throw new Error(`Database error: ${dbErr.message}`);
    }
    
    if (existingByEmail.length > 0) {
      // Link Google account to existing user
      const user = existingByEmail[0];
      console.log(`✅ Found existing user by email: ${user.username} (ID: ${user.id})`);
      
      const updates = { googleId, authProvider: 'google' };
      // Update avatar from Google profile if user doesn't have one yet
      if (!user.avatarUrl && picture) {
        updates.avatarUrl = picture;
      }
      
      try {
        await db.update(users).set(updates).where(eq(users.id, user.id));
        console.log(`✅ Updated user ${user.username} with Google OAuth data`);
      } catch (updateErr) {
        console.error('❌ Database update error:', updateErr);
        throw new Error(`Database update error: ${updateErr.message}`);
      }

      const token = createToken();
      tokenStore.set(token, user.username);

      const { ipAddress, userAgent } = extractClientInfo(c);
      await createAuditLog({
        userId: user.id,
        username: user.username,
        action: 'LOGIN',
        targetType: 'USER',
        targetId: user.id,
        description: `User ${user.username} linked Google account and logged in`,
        ipAddress,
        userAgent,
      });

      return c.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email || '',
          avatarUrl: updates.avatarUrl || user.avatarUrl || '',
        },
      });
    }

    // 3. Create new Google-only user with 'pending' role
    console.log(`📝 Creating new user for Google OAuth: ${email}`);
    const newUsername = email.split('@')[0];
    
    // Ensure username is unique by appending numbers if needed
    let usernameCandidate = newUsername;
    let counter = 1;
    while (true) {
      try {
        const existing = await db.select().from(users).where(eq(users.username, usernameCandidate)).limit(1);
        if (existing.length === 0) break;
        usernameCandidate = `${newUsername}${counter}`;
        counter++;
      } catch (dbErr) {
        console.error('❌ Database query error (username check):', dbErr);
        throw new Error(`Database error: ${dbErr.message}`);
      }
    }
    
    console.log(`📝 Generated username: ${usernameCandidate}`);

    let inserted = [];
    try {
      inserted = await db.insert(users).values({
        username: usernameCandidate,
        password: null, // Google-only users have no password
        role: 'pending', // Must be approved by admin before accessing sensitive data
        name: name || email.split('@')[0],
        email,
        googleId,
        authProvider: 'google',
        avatarUrl: picture || null,
      }).returning();
    } catch (insertErr) {
      console.error('❌ Database insert error:', insertErr);
      throw new Error(`Database insert error: ${insertErr.message}`);
    }
    
    const newUser = inserted[0];
    console.log(`✅ Created new user: ${newUser.username} (ID: ${newUser.id}, Role: ${newUser.role})`);

    const token = createToken();
    tokenStore.set(token, newUser.username);

    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: newUser.id,
      username: newUser.username,
      action: 'LOGIN',
      targetType: 'USER',
      targetId: newUser.id,
      description: `New user ${newUser.username} registered via Google OAuth (pending approval)`,
      ipAddress,
      userAgent,
    });

    return c.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        name: newUser.name,
        email: newUser.email || '',
        avatarUrl: newUser.avatarUrl || '',
      },
    });
  } catch (err) {
    console.error('❌ Google OAuth error:', err);
    console.error('❌ Error stack:', err.stack);
    console.error('❌ Error details:', {
      message: err.message,
      name: err.name,
      code: err.code
    });
    
    // Handle specific Google OAuth errors
    if (err.message.includes('Token used too late')) {
      return c.json({
        error: 'Token sudah kedaluwarsa. Silakan login kembali.',
      }, 401);
    } else if (err.message.includes('Invalid token signature')) {
      return c.json({
        error: 'Token tidak valid. Silakan coba lagi.',
      }, 401);
    } else if (err.message.includes('Audience mismatch')) {
      return c.json({
        error: 'Konfigurasi Google OAuth tidak sesuai. Hubungi administrator.',
      }, 500);
    }
    
    return c.json({
      error: 'Autentikasi Google gagal. Silakan coba lagi.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    }, 500);
  }
});

app.patch('/api/auth/avatar', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const body = await c.req.json();
    const { avatarUrl } = body;
    if (!avatarUrl) {
      return c.json({ error: 'avatarUrl is required' }, 400);
    }
    await db.update(users).set({ avatarUrl }).where(eq(users.id, user.id));
    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'SETTINGS_CHANGE',
      targetType: 'USER',
      targetId: user.id,
      description: `Updated profile avatar`,
      ipAddress, userAgent,
    });
    return c.json({ success: true, avatarUrl });
  } catch (err) {
    console.error('Error in PATCH /api/auth/avatar:', err);
    return c.json({ error: err.message || 'Failed to update avatar' }, 500);
  }
});

app.patch('/api/auth/change-password', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const body = await c.req.json();
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Password lama dan password baru wajib diisi' }, 400);
    }
    if (newPassword.length < 6) {
      return c.json({ error: 'Password baru minimal 6 karakter' }, 400);
    }
    // Verify current password
    const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const dbUser = rows[0];
    if (!dbUser || !verifyPassword(currentPassword, dbUser.password)) {
      return c.json({ error: 'Password lama tidak sesuai' }, 400);
    }
    // Update password
    await db.update(users).set({ password: hashPassword(newPassword) }).where(eq(users.id, user.id));
    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'SETTINGS_CHANGE',
      targetType: 'USER',
      targetId: user.id,
      description: `Changed own password`,
      ipAddress, userAgent,
    });
    return c.json({ success: true, message: 'Password berhasil diperbarui' });
  } catch (err) {
    console.error('Error in PATCH /api/auth/change-password:', err);
    return c.json({ error: err.message || 'Failed to change password' }, 500);
  }
});

app.get('/transactions', async (c) => {
  const rows = await db.select().from(transactions).orderBy(desc(transactions.createdAt));
  return c.json(rows);
});

app.get('/api/transactions', async (c) => {
  const rows = await db.select().from(transactions).orderBy(desc(transactions.createdAt));
  return c.json(rows);
});

app.post('/transactions', async (c) => {
  try {
    const body = await c.req.json();
    const { description, amount, type } = body;
    if (!description || amount == null || !type) {
      return c.json({ error: 'description, amount and type are required' }, 400);
    }

    // Guard against negative/zero amounts
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return c.json({ error: 'amount must be a positive number' }, 400);
    }

    const user = await getUserFromToken(c.req.header('authorization'));
    const res = await db.insert(transactions).values({
      description: String(description).trim(),
      amount: parsedAmount,
      type,
    }).returning();
    const transaction = res[0];

    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: user?.id || null,
      username: user?.username || 'system',
      action: 'CREATE_TRANSACTION',
      targetType: 'TRANSACTION',
      targetId: transaction.id,
      afterValue: transaction,
      description: `Created transaction: ${description} (Rp ${amount})`,
      ipAddress,
      userAgent,
    });

    return c.json(transaction);
  } catch (err) {
    console.error('Error in POST /transactions:', err);
    return c.json({ error: err.message || 'Failed to create transaction' }, 500);
  }
});

app.post('/api/transactions', async (c) => {
  const body = await c.req.json();
  console.log('Incoming POST /api/transactions:', body);
  const {
    description,
    amount,
    type,
    category,
    attachmentUrl,
    attachment_url,
    memberId,
    member_id,
    createdAt,
    created_at,
    status,
  } = body;

  if (!description || amount == null || !type) {
    return c.json({ error: 'description, amount and type are required' }, 400);
  }

  // Input validation: amount must be a positive integer
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !Number.isInteger(parsedAmount)) {
    return c.json({ error: 'amount must be a positive integer' }, 400);
  }

  // Input sanitization: cap string lengths to prevent DB abuse
  const MAX_DESC_LEN = 500;
  const MAX_CAT_LEN  = 100;
  if (typeof description === 'string' && description.trim().length === 0) {
    return c.json({ error: 'description cannot be empty' }, 400);
  }
  if (typeof description === 'string' && description.length > MAX_DESC_LEN) {
    return c.json({ error: `description exceeds maximum length of ${MAX_DESC_LEN} characters` }, 400);
  }
  if (typeof category === 'string' && category.length > MAX_CAT_LEN) {
    return c.json({ error: `category exceeds maximum length of ${MAX_CAT_LEN} characters` }, 400);
  }

  const user = await getUserFromToken(c.req.header('authorization'));
  const payload = {
    description: String(description).trim(),
    amount: parsedAmount,
    type,
    category,
    status: status || 'Pending',
  };

  const attachmentUrlValue = attachmentUrl ?? attachment_url;
  if (attachmentUrlValue) payload.attachmentUrl = attachmentUrlValue;

  const memberIdValue = memberId ?? member_id;
  if (memberIdValue) payload.memberId = memberIdValue;

  const createdAtValue = createdAt ?? created_at;
  // Convert createdAt to a Date object (frontend may send ISO string)
  if (createdAtValue) {
    try {
      payload.createdAt = new Date(createdAtValue);
    } catch (e) {
      payload.createdAt = new Date();
    }
  } else {
    // Ensure a createdAt is present so Drizzle/Pg receives a proper timestamp
    payload.createdAt = new Date();
  }

  try {
    const res = await db.insert(transactions).values(payload).returning();
    const transaction = res[0];

    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: user?.id || null,
      username: user?.username || 'system',
      action: 'CREATE_TRANSACTION',
      targetType: 'TRANSACTION',
      targetId: transaction.id,
      afterValue: transaction,
      description: `Created transaction: ${description} (Rp ${amount})`,
      ipAddress,
      userAgent,
    });

    return c.json(transaction);
  } catch (error) {
    console.error('Error inserting transaction:', error);
    return c.json({ error: error.message || 'Failed to create transaction' }, 500);
  }
});

app.patch('/api/transactions/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    if (!id) return c.json({ error: 'invalid id' }, 400);

    // RBAC: Only admin, ketua and wakil can approve/reject (change status)
    const currentUser = await getUserFromToken(c.req.header('authorization'));
    const canApprove = currentUser?.username === 'dutophy@gmail.com' || ['ketua', 'wakil'].includes(currentUser?.role);
    if (body.status && !canApprove) {
      return c.json({ error: 'Hanya Admin, Ketua, dan Wakil yang dapat menyetujui atau menolak transaksi.' }, 403);
    }

    // Get before value
    const beforeRows = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    const beforeTransaction = beforeRows[0];

    const values = {};
    if (body.description !== undefined) values.description = body.description;
    if (body.amount !== undefined) values.amount = Number(body.amount);
    if (body.type !== undefined) values.type = body.type;
    if (body.category !== undefined) values.category = body.category;
    if (body.status !== undefined) values.status = body.status;
    if (body.rejectionReason !== undefined) values.rejectionReason = body.rejectionReason;
    
    if (!Object.keys(values).length) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    const updated = await db.update(transactions).set(values).where(eq(transactions.id, id)).returning();
    const afterTransaction = updated[0];

    // Log transaction update (reuse currentUser already fetched above for RBAC check)
    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: currentUser?.id || null,
      username: currentUser?.username || 'system',
      action: 'UPDATE_TRANSACTION',
      targetType: 'TRANSACTION',
      targetId: id,
      beforeValue: beforeTransaction,
      afterValue: afterTransaction,
      description: `Updated transaction: ${afterTransaction.description}`,
      ipAddress,
      userAgent,
    });

    return c.json(updated);
  } catch (err) {
    console.error('Error in PATCH /api/transactions/:id:', err);
    return c.json({ error: err.message || 'Failed to update transaction' }, 500);
  }
});

// Members CRUD
app.get('/api/members', async (c) => {
  const rows = await db.select().from(members).orderBy(asc(members.nama));
  return c.json(rows);
});

app.post('/api/members', async (c) => {
  try {
    const body = await c.req.json();
    const { nama, kelas, status_kas, keterangan } = body;
    if (!nama) return c.json({ error: 'nama is required' }, 400);

    const user = await getUserFromToken(c.req.header('authorization'));
    const res = await db.insert(members).values({ nama, kelas, status_kas, keterangan }).returning();
    const member = res[0];

    // Log member creation
    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: user?.id || null,
      username: user?.username || 'system',
      action: 'CREATE_MEMBER',
      targetType: 'MEMBER',
      targetId: member.id,
      afterValue: member,
      description: `Added member: ${nama}`,
      ipAddress,
      userAgent,
    });

    return c.json(res);
  } catch (err) {
    console.error('Error in POST /api/members:', err);
    return c.json({ error: err.message || 'Failed to create member' }, 500);
  }
});

app.patch('/api/members/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    if (!id) return c.json({ error: 'invalid id' }, 400);

    // Get before value
    const beforeRows = await db.select().from(members).where(eq(members.id, id)).limit(1);
    const beforeMember = beforeRows[0];

    const values = {};
    if (body.nama !== undefined) values.nama = body.nama;
    if (body.kelas !== undefined) values.kelas = body.kelas;
    if (body.status_kas !== undefined) values.status_kas = body.status_kas;
    if (body.keterangan !== undefined) values.keterangan = body.keterangan;
    if (!Object.keys(values).length) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    const updated = await db.update(members).set(values).where(eq(members.id, id)).returning();
    const afterMember = updated[0];

    // Log member update
    const user = await getUserFromToken(c.req.header('authorization'));
    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: user?.id || null,
      username: user?.username || 'system',
      action: 'EDIT_MEMBER',
      targetType: 'MEMBER',
      targetId: id,
      beforeValue: beforeMember,
      afterValue: afterMember,
      description: `Updated member: ${afterMember.nama}`,
      ipAddress,
      userAgent,
    });

    return c.json(updated);
  } catch (err) {
    console.error('Error in PATCH /api/members/:id:', err);
    return c.json({ error: err.message || 'Failed to update member' }, 500);
  }
});

app.delete('/api/members/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid id' }, 400);

    // Get member before deletion for audit
    const memberRows = await db.select().from(members).where(eq(members.id, id)).limit(1);
    const member = memberRows[0];

    await db.delete(members).where(eq(members.id, id));

    // Log member deletion
    const user = await getUserFromToken(c.req.header('authorization'));
    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: user?.id || null,
      username: user?.username || 'system',
      action: 'DELETE_MEMBER',
      targetType: 'MEMBER',
      targetId: id,
      beforeValue: member,
      description: `Deleted member: ${member?.nama || 'Unknown'}`,
      ipAddress,
      userAgent,
    });

    return c.json({ ok: true });
  } catch (err) {
    console.error('Error in DELETE /api/members/:id:', err);
    return c.json({ error: err.message || 'Failed to delete member' }, 500);
  }
});

// Attendance
app.get('/api/attendance', async (c) => {
  const rows = await db.select().from(attendance).orderBy(desc(attendance.createdAt));
  return c.json(rows);
});

app.patch('/api/attendance/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    const { status } = body;
    if (!id || !status) return c.json({ error: 'id and status required' }, 400);
    const res = await db.update(attendance).set({ status }).where(eq(attendance.id, id)).returning();
    return c.json(res);
  } catch (err) {
    console.error('Error in PATCH /api/attendance/:id:', err);
    return c.json({ error: err.message || 'Failed to update attendance' }, 500);
  }
});

app.post('/api/attendance', async (c) => {
  const body = await c.req.json();
  const { member_id, memberId, bulan, minggu_ke, status } = body;
  const normalizedMemberId = Number(member_id ?? memberId);
  const normalizedWeek = Number(minggu_ke);

  if (!Number.isInteger(normalizedMemberId) || normalizedMemberId <= 0 || !bulan || !Number.isInteger(normalizedWeek) || normalizedWeek < 1 || normalizedWeek > 4) {
    return c.json({ error: 'member_id, bulan and minggu_ke are required' }, 400);
  }

  try {
    const user = await getUserFromToken(c.req.header('authorization'));

    const existingRows = await db
      .select()
      .from(attendance)
      .where(and(
        eq(attendance.member_id, normalizedMemberId),
        eq(attendance.bulan, String(bulan)),
        eq(attendance.minggu_ke, normalizedWeek),
      ))
      .limit(1);

    if (existingRows.length > 0) {
      const beforeAttendance = existingRows[0];
      const updated = await db
        .update(attendance)
        .set({ status: status || '-' })
        .where(eq(attendance.id, beforeAttendance.id))
        .returning();
      const afterAttendance = updated[0];

      const { ipAddress, userAgent } = extractClientInfo(c);
      await createAuditLog({
        userId: user?.id || null,
        username: user?.username || 'system',
        action: 'UPDATE_ATTENDANCE',
        targetType: 'ATTENDANCE',
        targetId: afterAttendance.id,
        beforeValue: beforeAttendance,
        afterValue: afterAttendance,
        description: `Updated attendance for member ${normalizedMemberId} bulan ${bulan} minggu ${normalizedWeek}`,
        ipAddress,
        userAgent,
      });

      return c.json(afterAttendance);
    }

    const res = await db.insert(attendance).values({
      member_id: normalizedMemberId,
      bulan: String(bulan),
      minggu_ke: normalizedWeek,
      status: status || '-',
    }).returning();
    const created = res[0];

    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: user?.id || null,
      username: user?.username || 'system',
      action: 'CREATE_ATTENDANCE',
      targetType: 'ATTENDANCE',
      targetId: created.id,
      afterValue: created,
      description: `Created attendance for member ${normalizedMemberId} bulan ${bulan} minggu ${normalizedWeek}`,
      ipAddress,
      userAgent,
    });

    return c.json(created);
  } catch (err) {
    console.error('Error creating attendance:', err);
    return c.json({ error: 'Failed to create attendance' }, 500);
  }
});

// Monthly Cash
app.get('/api/cash', async (c) => {
  const rows = await db.select().from(cashRecords).orderBy(desc(cashRecords.createdAt));
  return c.json(rows);
});

app.post('/api/cash', async (c) => {
  const body = await c.req.json();
  const { member_id, memberId, bulan, minggu_ke, status } = body;
  const normalizedMemberId = Number(member_id ?? memberId);
  const normalizedWeek = Number(minggu_ke);

  if (!Number.isInteger(normalizedMemberId) || normalizedMemberId <= 0 || !bulan || !Number.isInteger(normalizedWeek) || normalizedWeek < 1 || normalizedWeek > 4) {
    return c.json({ error: 'member_id, bulan and minggu_ke are required' }, 400);
  }

  try {
    const user = await getUserFromToken(c.req.header('authorization'));
    const normalizedStatus = status || '-';

    const existingRows = await db
      .select()
      .from(cashRecords)
      .where(and(
        eq(cashRecords.member_id, normalizedMemberId),
        eq(cashRecords.bulan, String(bulan)),
        eq(cashRecords.minggu_ke, normalizedWeek),
      ))
      .limit(1);

    if (existingRows.length > 0) {
      const beforeCash = existingRows[0];
      const updated = await db
        .update(cashRecords)
        .set({ status: normalizedStatus })
        .where(eq(cashRecords.id, beforeCash.id))
        .returning();
      const afterCash = updated[0];

      const { ipAddress, userAgent } = extractClientInfo(c);
      await createAuditLog({
        userId: user?.id || null,
        username: user?.username || 'system',
        action: 'UPDATE_CASH',
        targetType: 'CASH',
        targetId: afterCash.id,
        beforeValue: beforeCash,
        afterValue: afterCash,
        description: `Updated cash for member ${normalizedMemberId} bulan ${bulan} minggu ${normalizedWeek}`,
        ipAddress,
        userAgent,
      });

      return c.json(afterCash);
    }

    const res = await db.insert(cashRecords).values({
      member_id: normalizedMemberId,
      bulan: String(bulan),
      minggu_ke: normalizedWeek,
      status: normalizedStatus,
    }).returning();
    const created = res[0];

    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: user?.id || null,
      username: user?.username || 'system',
      action: 'CREATE_CASH',
      targetType: 'CASH',
      targetId: created.id,
      afterValue: created,
      description: `Created cash for member ${normalizedMemberId} bulan ${bulan} minggu ${normalizedWeek}`,
      ipAddress,
      userAgent,
    });

    return c.json(created);
  } catch (err) {
    console.error('Error saving cash:', err);
    return c.json({ error: 'Failed to save cash' }, 500);
  }
});

// Approvals queue
app.get('/api/approvals', async (c) => {
  const rows = await db.select().from(approvals).orderBy(desc(approvals.createdAt));
  return c.json(rows);
});

app.post('/api/approvals', async (c) => {
  try {
    const body = await c.req.json();
    const { deskripsi, kategori, tipe, nominal, diajukan_oleh, bukti_transfer } = body;
    if (!deskripsi || !tipe || !nominal) return c.json({ error: 'deskripsi, tipe and nominal required' }, 400);

    const user = await getUserFromToken(c.req.header('authorization'));
    const res = await db.insert(approvals).values({ deskripsi, kategori, tipe, nominal: Number(nominal), diajukan_oleh, bukti_transfer }).returning();
    const approval = res[0];

    // Log approval creation
    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: user?.id || null,
      username: user?.username || 'system',
      action: 'CREATE_APPROVAL',
      targetType: 'APPROVAL',
      targetId: approval.id,
      afterValue: approval,
      description: `Created approval: ${deskripsi} (Rp ${nominal})`,
      ipAddress,
      userAgent,
    });

    return c.json(res);
  } catch (err) {
    console.error('Error in POST /api/approvals:', err);
    return c.json({ error: err.message || 'Failed to create approval' }, 500);
  }
});

app.patch('/api/approvals/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    const { status } = body;
    if (!id || !status) return c.json({ error: 'id and status required' }, 400);

    // Get before value
    const beforeRows = await db.select().from(approvals).where(eq(approvals.id, id)).limit(1);
    const beforeApproval = beforeRows[0];

    const updated = await db.update(approvals).set({ status }).where(eq(approvals.id, id)).returning();
    const afterApproval = updated[0];

    try {
      const approval = afterApproval;
      if (approval && approval.status === 'Approved') {
        const description = approval.deskripsi || `Approval #${approval.id}`;
        const amount = Number(approval.nominal) || 0;
        // tipe field can be 'Pemasukan', 'Pengeluaran', or legacy values
        const type = approval.tipe === 'Pengeluaran' ? 'Pengeluaran' : 'Pemasukan';
        if (amount > 0) {
          await db.insert(transactions).values({
            description,
            amount,
            type,
            category: approval.kategori || 'Persetujuan',
            status: 'Approved',
          }).returning();
        }
      }
    } catch (err) {
      console.error('Error creating transaction for approval:', err);
    }

    // Log approval status change
    const user = await getUserFromToken(c.req.header('authorization'));
    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: user?.id || null,
      username: user?.username || 'system',
      action: 'APPROVE_EXPENSE',
      targetType: 'APPROVAL',
      targetId: id,
      beforeValue: beforeApproval,
      afterValue: afterApproval,
      description: `Changed approval status to: ${status}`,
      ipAddress,
      userAgent,
    });

    return c.json(updated);
  } catch (err) {
    console.error('Error in PATCH /api/approvals/:id:', err);
    return c.json({ error: err.message || 'Failed to update approval' }, 500);
  }
});

// Audit Logs - GET with filters (Can view audit logs: admin, ketua, wakil)
app.get('/api/audit-logs', async (c) => {
  const user = await getUserFromToken(c.req.header('authorization'));
  
  // Debug logging for role verification
  console.log('Audit log request - User:', user?.username, 'Role:', user?.role);
  
  // All-powerful roles (admin, ketua, wakil) can view audit logs (case-insensitive)
  if (!hasFullAccess(user)) {
    console.log('Access denied for role:', (user?.role || '').toLowerCase());
    return c.json({ error: 'Forbidden: Access denied. Admin, Ketua, or Wakil privileges required.' }, 403);
  }

  const username = c.req.query('username') || null;
  const action = c.req.query('action') || null;
  const startDate = c.req.query('startDate') || null;
  const endDate = c.req.query('endDate') || null;
  const limit = Math.min(Number(c.req.query('limit') || 50), 100);
  const offset = Number(c.req.query('offset') || 0);

  let whereConditions = [];

  if (username) {
    whereConditions.push(like(auditLogs.username, `%${username}%`));
  }

  if (action) {
    whereConditions.push(eq(auditLogs.action, action));
  }

  if (startDate) {
    whereConditions.push(gte(auditLogs.createdAt, new Date(startDate)));
  }

  if (endDate) {
    whereConditions.push(lte(auditLogs.createdAt, new Date(endDate)));
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  try {
    const logs = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select()
      .from(auditLogs)
      .where(whereClause);

    return c.json({
      success: true,
      data: logs,
      total: countResult.length,
      limit,
      offset,
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return c.json({ error: 'Failed to fetch audit logs' }, 500);
  }
});

// Master admin check: identified strictly by username === 'dutophy@gmail.com'
const isMasterAdmin = (user) => {
  return user?.username?.toLowerCase?.() === 'dutophy@gmail.com';
};

// Unified ALL-POWERFUL role check: master admin OR ketua/wakil 
const hasFullAccess = (user) => {
  if (!user) return false;
  const username = user?.username?.toLowerCase?.() || '';
  const role = (user?.role || '').toLowerCase().trim();
  return username === 'dutophy@gmail.com' || role === 'ketua' || role === 'wakil';
};

const hasCashConfigAccess = (user) => {
  if (!user) return false;
  if (user.status === 'alumni') return false;
  const username = user?.username?.toLowerCase?.() || '';
  const role = (user?.role || '').toLowerCase().trim();
  return username === 'dutophy@gmail.com' || ['ketua', 'wakil', 'sekretaris', 'bendahara'].includes(role);
};

// ─── Admin User Management API ────────────────────────────────────────────
app.get('/api/admin/users', async (c) => {
  const user = await getUserFromToken(c.req.header('authorization'));
  if (!hasFullAccess(user)) {
    return c.json({ error: 'Unauthorized: Admin, Ketua, or Wakil privileges required.' }, 403);
  }
  const rows = await db.select({
    id: users.id,
    username: users.username,
    name: users.name,
    email: users.email,
    role: users.role,
    status: users.status,
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
  }).from(users).orderBy(users.name);
  return c.json({ success: true, data: rows });
});

app.post('/api/admin/users', async (c) => {
  try {
    const currentUser = await getUserFromToken(c.req.header('authorization'));
    if (!hasFullAccess(currentUser)) {
      return c.json({ error: 'Unauthorized: Admin, Ketua, or Wakil privileges required.' }, 403);
    }
    const body = await c.req.json();
    const { name, email, role } = body;
    if (!name || !email || !role) {
      return c.json({ error: 'name, email, and role are required' }, 400);
    }
    // Check for duplicate email
    const existingEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail.length > 0) {
      return c.json({ error: 'Email already registered' }, 400);
    }
    // Generate username from email and default password
    const username = email.split('@')[0];
    const defaultPassword = 'Dubes2026!';
    const inserted = await db.insert(users).values({
      username,
      password: hashPassword(defaultPassword),
      name,
      email,
      role,
      status: 'active',
    }).returning();
    const newUser = inserted[0];

    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'CREATE_USER',
      targetType: 'USER',
      targetId: newUser.id,
      afterValue: { ...newUser, password: '[REDACTED]' },
      description: `Created user: ${name} (${role})`,
      ipAddress, userAgent,
    });

    return c.json({
      success: true,
      data: { ...newUser, password: '[REDACTED]', temporaryPassword: defaultPassword },
    });
  } catch (err) {
    console.error('Error in POST /api/admin/users:', err);
    return c.json({ error: err.message || 'Failed to create user' }, 500);
  }
});

app.patch('/api/admin/users/:id/role', async (c) => {
  try {
    const currentUser = await getUserFromToken(c.req.header('authorization'));
    if (!hasFullAccess(currentUser)) {
      return c.json({ error: 'Unauthorized: Admin, Ketua, or Wakil privileges required.' }, 403);
    }
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    const { role } = body;
    if (!id || !role) return c.json({ error: 'id and role required' }, 400);
    if (id === currentUser.id) return c.json({ error: 'Cannot change your own role' }, 400);

    const beforeRows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const before = beforeRows[0];
    if (!before) return c.json({ error: 'User not found' }, 404);

    const updated = await db.update(users).set({ role }).where(eq(users.id, id)).returning();

    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'ROLE_CHANGE',
      targetType: 'USER',
      targetId: id,
      beforeValue: before,
      afterValue: updated[0],
      description: `Changed ${before.name} role from ${before.role} to ${role}`,
      ipAddress, userAgent,
    });

    return c.json({ success: true, data: updated[0] });
  } catch (err) {
    console.error('Error in PATCH /api/admin/users/:id/role:', err);
    return c.json({ error: err.message || 'Failed to update role' }, 500);
  }
});

app.patch('/api/admin/users/:id/reset-password', async (c) => {
  try {
    const currentUser = await getUserFromToken(c.req.header('authorization'));
    if (!hasFullAccess(currentUser)) {
      return c.json({ error: 'Unauthorized: Admin, Ketua, or Wakil privileges required.' }, 403);
    }
    const id = Number(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid id' }, 400);

    const beforeRows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!beforeRows[0]) return c.json({ error: 'User not found' }, 404);

    // Accept dynamic password from request body, fallback to default
    const body = await c.req.json().catch(() => ({}));
    const newPassword = body.password || 'Dubes2026!';
    await db.update(users).set({ password: hashPassword(newPassword) }).where(eq(users.id, id));

    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'RESET_PASSWORD',
      targetType: 'USER',
      targetId: id,
      description: `Reset password for ${beforeRows[0].name}`,
      ipAddress, userAgent,
    });

    return c.json({ success: true, temporaryPassword: newPassword });
  } catch (err) {
    console.error('Error in PATCH /api/admin/users/:id/reset-password:', err);
    return c.json({ error: err.message || 'Failed to reset password' }, 500);
  }
});

app.patch('/api/admin/users/:id/status', async (c) => {
  try {
    const currentUser = await getUserFromToken(c.req.header('authorization'));
    if (!hasFullAccess(currentUser)) {
      return c.json({ error: 'Unauthorized: Admin, Ketua, or Wakil privileges required.' }, 403);
    }
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    const { status } = body;
    if (!id || !['active', 'alumni'].includes(status)) return c.json({ error: 'valid id and status required' }, 400);
    if (id === currentUser.id) return c.json({ error: 'Cannot change your own status' }, 400);

    const beforeRows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!beforeRows[0]) return c.json({ error: 'User not found' }, 404);

    // Protect main master admin account from deactivation
    if (status === 'alumni' && isMasterAdmin(beforeRows[0])) {
      return c.json({ error: 'Proteksi Sistem: Akun Admin utama tidak dapat dinonaktifkan.' }, 400);
    }

    const updated = await db.update(users).set({ status }).where(eq(users.id, id)).returning();

    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'EDIT_MEMBER',
      targetType: 'USER',
      targetId: id,
      beforeValue: beforeRows[0],
      afterValue: updated[0],
      description: `${status === 'alumni' ? 'Deactivated' : 'Reactivated'} user: ${beforeRows[0].name}`,
      ipAddress, userAgent,
    });

    return c.json({ success: true, data: updated[0] });
  } catch (err) {
    console.error('Error in PATCH /api/admin/users/:id/status:', err);
    return c.json({ error: err.message || 'Failed to update status' }, 500);
  }
});

// ─── Vercel Blob Upload API ──────────────────────────────────────────────
// Diagnostic endpoint: check if upload service is properly configured
app.get('/api/upload/status', (c) => {
  const token = process.env['BLOB_READ_WRITE_TOKEN'];
  return c.json({
    configured: !!token,
    message: token
      ? 'Vercel Blob token is configured'
      : 'BLOB_READ_WRITE_TOKEN is NOT set — avatar uploads will fail. Add it in Render dashboard → Environment.',
  });
});

// Upload endpoint: receives multipart FormData from frontend, uploads to Vercel Blob
app.post('/api/upload', async (c) => {
  console.log('POST /api/upload — content-type:', c.req.header('content-type'));
  console.log('AVAILABLE ENV KEYS:', Object.keys(process.env));
  console.log('BLOB_READ_WRITE_TOKEN present:', !!process.env['BLOB_READ_WRITE_TOKEN']);

  try {
    const formData = await c.req.parseBody();
    console.log('parseBody keys:', Object.keys(formData));
    
    const file = formData['file'];
    
    if (!file) {
      console.error('No file field in formData. Received keys:', Object.keys(formData));
      return c.json({ success: false, error: 'File is required. Expected multipart/form-data with "file" field.' }, 400);
    }

    // Convert File/Blob/Buffer to Buffer
    let buffer;
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else if (typeof file === 'object' && typeof file.arrayBuffer === 'function') {
      const ab = await file.arrayBuffer();
      buffer = Buffer.from(ab);
    } else if (typeof file === 'string') {
      buffer = Buffer.from(file, 'binary');
    } else {
      console.error('Unsupported file type:', typeof file, file?.constructor?.name);
      return c.json({ success: false, error: 'Unsupported file format' }, 400);
    }

    console.log('File buffer size:', buffer.length, 'bytes');

    const filename = `avatars/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
    const url = await uploadToVercelBlob(filename, buffer);
    return c.json({ success: true, url });
  } catch (err) {
    console.error('❌ Upload error:', err);
    console.error('   Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return c.json({ 
      success: false, 
      error: err.message || 'Upload failed. Check server logs for details.' 
    }, 500);
  }
});

// ─── Config API ────────────────────────────────────────────────────────────
app.get('/api/config', async (c) => {
  const rows = await db.select().from(config);
  const result = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return c.json({ success: true, data: result });
});

app.patch('/api/config', async (c) => {
  try {
    const body = await c.req.json();
    const user = await getUserFromToken(c.req.header('authorization'));
    // All authenticated users (admin, ketua, wakil, sekretaris, bendahara) can save cash config
    if (!hasCashConfigAccess(user)) {
      return c.json({ error: 'Unauthorized: hanya pengurus aktif yang dapat mengubah konfigurasi kas.' }, 403);
    }

    if (body.weeklyFee !== undefined) {
      const weeklyFee = Number(body.weeklyFee);
      if (!Number.isFinite(weeklyFee) || weeklyFee < 0) {
        return c.json({ error: 'Nominal kas mingguan tidak valid.' }, 400);
      }
    }

    const results = {};
    for (const [key, value] of Object.entries(body)) {
      const existing = await db.select().from(config).where(eq(config.key, key)).limit(1);
      if (existing.length > 0) {
        const updated = await db.update(config).set({ value: String(value), updatedAt: new Date() }).where(eq(config.key, key)).returning();
        results[key] = updated[0];
      } else {
        const inserted = await db.insert(config).values({ key, value: String(value) }).returning();
        results[key] = inserted[0];
      }
    }

    const { ipAddress, userAgent } = extractClientInfo(c);
    await createAuditLog({
      userId: user?.id || null,
      username: user?.username || 'system',
      action: 'SETTINGS_CHANGE',
      targetType: 'CONFIG',
      afterValue: results,
      description: `Updated config: ${Object.keys(body).join(', ')}`,
      ipAddress,
      userAgent,
    });

    return c.json({ success: true, data: results });
  } catch (err) {
    console.error('Error in PATCH /api/config:', err);
    return c.json({ error: err.message || 'Failed to update config' }, 500);
  }
});

// ─── Categories API ────────────────────────────────────────────────────────
app.get('/api/categories', async (c) => {
  const type = c.req.query('type');
  let query = db.select().from(categories).orderBy(asc(categories.name));
  if (type) {
    query = db.select().from(categories).where(eq(categories.type, type)).orderBy(asc(categories.name));
  }
  const rows = await query;
  return c.json(rows);
});

app.post('/api/categories', async (c) => {
  const body = await c.req.json();
  const { name, type } = body;
  if (!name || !type) {
    return c.json({ error: 'name and type are required' }, 400);
  }
  if (!['Pemasukan', 'Pengeluaran'].includes(type)) {
    return c.json({ error: 'type must be Pemasukan or Pengeluaran' }, 400);
  }
  const user = await getUserFromToken(c.req.header('authorization'));
  if (!hasCashConfigAccess(user)) {
    return c.json({ error: 'Unauthorized: hanya pengurus aktif yang dapat menambah kategori.' }, 403);
  }
  const cleanName = String(name).trim();
  if (!cleanName) {
    return c.json({ error: 'Nama kategori wajib diisi.' }, 400);
  }

  const existingCategories = await db.select().from(categories).where(eq(categories.type, type));
  const duplicate = existingCategories.some((cat) => cat.name.toLowerCase().trim() === cleanName.toLowerCase());
  if (duplicate) {
    return c.json({ error: 'Kategori dengan nama tersebut sudah ada.' }, 409);
  }

  const res = await db.insert(categories).values({ name: cleanName, type }).returning();

  const { ipAddress, userAgent } = extractClientInfo(c);
  await createAuditLog({
    userId: user.id,
    username: user.username,
    action: 'SETTINGS_CHANGE',
    targetType: 'CATEGORY',
    targetId: res[0].id,
    afterValue: res[0],
    description: `Added ${type} category: ${cleanName}`,
    ipAddress,
    userAgent,
  });

  return c.json(res[0]);
});

app.delete('/api/categories/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!id) return c.json({ error: 'invalid id' }, 400);
  const user = await getUserFromToken(c.req.header('authorization'));
  if (!hasCashConfigAccess(user)) {
    return c.json({ error: 'Unauthorized: hanya pengurus aktif yang dapat menghapus kategori.' }, 403);
  }

  // Get the category to check its name
  const categoryRows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (categoryRows.length === 0) {
    return c.json({ error: 'Kategori tidak ditemukan' }, 404);
  }
  const category = categoryRows[0];

  // Check if this category is used in any transactions
  const usedInTransactions = await db.select().from(transactions).where(eq(transactions.category, category.name)).limit(1);
  if (usedInTransactions.length > 0) {
    return c.json({ error: 'Kategori tidak dapat dihapus karena sudah digunakan dalam riwayat transaksi.' }, 400);
  }

  await db.delete(categories).where(eq(categories.id, id));

  const { ipAddress, userAgent } = extractClientInfo(c);
  await createAuditLog({
    userId: user.id,
    username: user.username,
    action: 'SETTINGS_CHANGE',
    targetType: 'CATEGORY',
    targetId: id,
    beforeValue: category,
    description: `Deleted ${category.type} category: ${category.name}`,
    ipAddress,
    userAgent,
  });

  return c.json({ ok: true });
});

const port = Number(process.env.PORT || 3001);

console.log(`Starting API server on port ${port}...`);
serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});