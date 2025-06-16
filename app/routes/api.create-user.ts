import { json, type ActionFunctionArgs } from '@remix-run/node';
import { requireAdmin } from '~/lib/auth.server';
import { createUserAsAdmin } from '~/lib/auth.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    await requireAdmin(request);
  } catch {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email, username, password } = await request.json();

    if (!email || !username || !password) {
      return json({ error: 'Email, username, and password are required' }, { status: 400 });
    }

    const user = await createUserAsAdmin(email, username, password);

    return json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error('Error creating user:', error);

    if (error.code === 'P2002') {
      return json({ error: 'User with this email or username already exists' }, { status: 400 });
    }

    return json({ error: 'Failed to create user' }, { status: 500 });
  }
};
