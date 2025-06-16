import { redirect, type LoaderFunctionArgs } from '@remix-run/node';

export async function loader({ params }: LoaderFunctionArgs) {
  const chatId = params.id;

  if (!chatId) {
    throw new Response('Chat ID is required', { status: 400 });
  }

  // redirect to main page with chat ID as query parameter
  return redirect(`/?chatId=${chatId}`);
}

export default function ChatPage() {
  // this component won't be rendered due to the redirect
  return null;
}
