import { type ActionFunctionArgs, json } from '@remix-run/node';
import { ChatStore } from '~/lib/stores/chat.server';
import { getUserId } from '~/lib/auth.server';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { chatId, messages, title } = await request.json();

    if (!chatId || !messages) {
      return json({ error: 'Chat ID and messages are required' }, { status: 400 });
    }

    // get user ID if authenticated
    const userId = await getUserId(request);

    // save chat with user association
    await ChatStore.saveChat(chatId, messages, title, userId || undefined);

    return json({ success: true });
  } catch (error) {
    console.error('Error saving chat:', error);
    return json({ error: 'Failed to save chat' }, { status: 500 });
  }
}
