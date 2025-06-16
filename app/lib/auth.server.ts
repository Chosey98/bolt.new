import bcrypt from 'bcryptjs';
import { createCookieSessionStorage, redirect } from '@remix-run/node';
import { prisma } from './db.server';

const sessionSecret = process.env.SESSION_SECRET || 'bolt-super-secret-session-key-change-in-production-12345';

if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set');
}

const storage = createCookieSessionStorage({
  cookie: {
    name: 'bolt_session',
    secure: process.env.NODE_ENV === 'production',
    secrets: [sessionSecret],
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
  },
});

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set('userId', userId);

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await storage.commitSession(session),
    },
  });
}

export async function getUserSession(request: Request) {
  return storage.getSession(request.headers.get('Cookie'));
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get('userId');

  if (!userId || typeof userId !== 'string') {
    return null;
  }

  return userId;
}

export async function requireUserId(request: Request, redirectTo: string = new URL(request.url).pathname) {
  const userId = await getUserId(request);

  if (!userId) {
    const searchParams = new URLSearchParams([['redirectTo', redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }

  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);

  if (typeof userId !== 'string') {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, isAdmin: true },
    });
    return user;
  } catch {
    throw logout(request);
  }
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect('/login', {
    headers: {
      'Set-Cookie': await storage.destroySession(session),
    },
  });
}

export async function createUser(email: string, username: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
    },
  });
}

export async function verifyLogin(email: string, password: string) {
  const userWithPassword = await prisma.user.findUnique({
    where: { email },
  });

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(password, userWithPassword.password);

  if (!isValid) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}

export async function requireAdmin(request: Request) {
  const user = await getUser(request);

  if (!user) {
    throw redirect('/login');
  }

  if (!user.isAdmin) {
    throw redirect('/', {
      headers: {
        'Set-Cookie': await storage.commitSession(await storage.getSession(request.headers.get('Cookie'))),
      },
    });
  }

  return user;
}

export async function createUserAsAdmin(email: string, username: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      isAdmin: false,
    },
  });
}

export async function hasAdminUser(): Promise<boolean> {
  const adminCount = await prisma.user.count({
    where: { isAdmin: true },
  });
  return adminCount > 0;
}

export async function createAdminUser(email: string, username: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      isAdmin: true,
    },
  });
}
