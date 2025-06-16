import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useActionData, useSearchParams } from '@remix-run/react';
import { verifyLogin, createUserSession, getUserId, hasAdminUser } from '~/lib/auth.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Login | Bolt' }];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // check if admin user exists, if not redirect to setup
  const adminExists = await hasAdminUser();

  if (!adminExists) {
    return redirect('/setup');
  }

  const userId = await getUserId(request);

  if (userId) {
    return redirect('/');
  }

  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');
  const redirectTo = formData.get('redirectTo') || '/';

  if (typeof email !== 'string' || email.length === 0) {
    return json({ errors: { email: 'Email is required', password: null } }, { status: 400 });
  }

  if (typeof password !== 'string' || password.length === 0) {
    return json({ errors: { email: null, password: 'Password is required' } }, { status: 400 });
  }

  if (password.length < 8) {
    return json({ errors: { email: null, password: 'Password is too short' } }, { status: 400 });
  }

  const user = await verifyLogin(email, password);

  if (!user) {
    return json({ errors: { email: 'Invalid email or password', password: null } }, { status: 400 });
  }

  return createUserSession(user.id, typeof redirectTo === 'string' ? redirectTo : '/');
};

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
        </div>
        <Form method="post" className="mt-8 space-y-6">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
              {actionData?.errors?.email && (
                <div className="pt-1 text-red-700" id="email-error">
                  {actionData.errors.email}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
              {actionData?.errors?.password && (
                <div className="pt-1 text-red-700" id="password-error">
                  {actionData.errors.password}
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
