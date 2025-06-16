import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { useLoaderData, useActionData, Form, useNavigation } from '@remix-run/react';
import { requireAdmin, createUserAsAdmin } from '~/lib/auth.server';
import { prisma } from '~/lib/db.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireAdmin(request);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      isAdmin: true,
      createdAt: true,
      _count: {
        select: {
          chats: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return json({ users });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireAdmin(request);

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'create') {
    const email = formData.get('email')?.toString();
    const username = formData.get('username')?.toString();
    const password = formData.get('password')?.toString();

    if (!email || !username || !password) {
      return json({ error: 'Email, username, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    try {
      // check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        return json({ error: 'User with this email or username already exists' }, { status: 400 });
      }

      await createUserAsAdmin(email, username, password);

      return json({ success: 'User created successfully' });
    } catch (error) {
      console.error('Error creating user:', error);
      return json({ error: 'Failed to create user' }, { status: 500 });
    }
  }

  if (intent === 'delete') {
    const userId = formData.get('userId')?.toString();

    if (!userId) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
      // check if user exists and is not an admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return json({ error: 'User not found' }, { status: 404 });
      }

      if (user.isAdmin) {
        return json({ error: 'Cannot delete admin users' }, { status: 400 });
      }

      // delete user's chats first
      await prisma.message.deleteMany({
        where: {
          chat: {
            userId,
          },
        },
      });

      await prisma.chat.deleteMany({
        where: { userId },
      });

      // delete user
      await prisma.user.delete({
        where: { id: userId },
      });

      return json({ success: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      return json({ error: 'Failed to delete user' }, { status: 500 });
    }
  }

  return json({ error: 'Invalid action' }, { status: 400 });
};

export default function AdminDashboard() {
  const { users } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage users and system settings</p>
        </div>

        {/* Create User Form */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New User</h2>

          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="create" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  minLength={8}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </Form>

          {actionData && 'error' in actionData && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{actionData.error}</div>
          )}

          {actionData && 'success' in actionData && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {actionData.success}
            </div>
          )}
        </div>

        {/* Users List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Users ({users.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(
                  (user: {
                    id: string;
                    email: string;
                    username: string;
                    isAdmin: boolean;
                    createdAt: string;
                    _count: { chats: number };
                  }) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.isAdmin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user._count.chats}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!user.isAdmin && (
                          <Form method="post" className="inline">
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="userId" value={user.id} />
                            <button
                              type="submit"
                              onClick={(e) => {
                                if (
                                  !confirm(
                                    'Are you sure you want to delete this user? This will also delete all their chats.',
                                  )
                                ) {
                                  e.preventDefault();
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </Form>
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8">
          <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Chat
          </a>
        </div>
      </div>
    </div>
  );
}
