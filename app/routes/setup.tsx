import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { hasAdminUser, createAdminUser, createUserSession } from '~/lib/auth.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Setup Admin Account | Bolt' }];
};

export const loader = async ({ request: _request }: LoaderFunctionArgs) => {
  // if admin already exists, redirect to login
  const adminExists = await hasAdminUser();

  if (adminExists) {
    return redirect('/login');
  }

  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // check if admin already exists
  const adminExists = await hasAdminUser();

  if (adminExists) {
    return redirect('/login');
  }

  const formData = await request.formData();
  const email = formData.get('email');
  const username = formData.get('username');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  if (typeof email !== 'string' || email.length === 0) {
    return json(
      { errors: { email: 'Email is required', username: null, password: null, confirmPassword: null } },
      { status: 400 },
    );
  }

  if (typeof username !== 'string' || username.length === 0) {
    return json(
      { errors: { email: null, username: 'Username is required', password: null, confirmPassword: null } },
      { status: 400 },
    );
  }

  if (typeof password !== 'string' || password.length === 0) {
    return json(
      { errors: { email: null, username: null, password: 'Password is required', confirmPassword: null } },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return json(
      {
        errors: {
          email: null,
          username: null,
          password: 'Password must be at least 8 characters',
          confirmPassword: null,
        },
      },
      { status: 400 },
    );
  }

  if (typeof confirmPassword !== 'string' || confirmPassword !== password) {
    return json(
      { errors: { email: null, username: null, password: null, confirmPassword: 'Passwords do not match' } },
      { status: 400 },
    );
  }

  try {
    const user = await createAdminUser(email, username, password);
    return createUserSession(user.id, '/');
  } catch {
    return json(
      { errors: { email: 'Failed to create admin account', username: null, password: null, confirmPassword: null } },
      { status: 500 },
    );
  }
};

export default function SetupPage() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Setup Admin Account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome to Bolt! Create your admin account to get started.
          </p>
        </div>
        <Form method="post" className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="admin@example.com"
              />
              {actionData?.errors?.email && (
                <div className="pt-1 text-red-700" id="email-error">
                  {actionData.errors.email}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="admin"
              />
              {actionData?.errors?.username && (
                <div className="pt-1 text-red-700" id="username-error">
                  {actionData.errors.username}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password (min 8 characters)"
              />
              {actionData?.errors?.password && (
                <div className="pt-1 text-red-700" id="password-error">
                  {actionData.errors.password}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm password"
              />
              {actionData?.errors?.confirmPassword && (
                <div className="pt-1 text-red-700" id="confirmPassword-error">
                  {actionData.errors.confirmPassword}
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Admin Account
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
