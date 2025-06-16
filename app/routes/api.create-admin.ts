import { json, type ActionFunctionArgs } from '@remix-run/node';
import { prisma } from '~/lib/db.server';
import bcrypt from 'bcryptjs';

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // check if any admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { isAdmin: true },
    });

    if (existingAdmin) {
      return json({ error: 'Admin user already exists. This endpoint is disabled.' }, { status: 403 });
    }

    const formData = await request.formData();
    const email = formData.get('email')?.toString();
    const username = formData.get('username')?.toString();
    const password = formData.get('password')?.toString();

    if (!email || !username || !password) {
      return json({ error: 'Email, username, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // check if user with email or username already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return json({ error: 'User with this email or username already exists' }, { status: 400 });
    }

    // hash password and create admin user
    const hashedPassword = await bcrypt.hash(password, 12);

    const adminUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        isAdmin: true,
      },
    });

    return json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: adminUser.id,
        email: adminUser.email,
        username: adminUser.username,
        isAdmin: adminUser.isAdmin,
      },
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
