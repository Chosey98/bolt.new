import { json, type ActionFunctionArgs } from '@remix-run/node';
import { getUserId } from '~/lib/auth.server';
import { ChatStore } from '~/lib/stores/chat.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const userId = await getUserId(request);

  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { chatId } = await request.json();

    if (!chatId) {
      return json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // check if user owns this chat
    const chat = await ChatStore.getChat(chatId);

    if (!chat) {
      return json({ error: 'Chat not found' }, { status: 404 });
    }

    if (chat.userId !== userId) {
      return json({ error: 'You can only share your own chats' }, { status: 403 });
    }

    // make the chat public
    await ChatStore.makeChatPublic(chatId);

    return json({ success: true });
  } catch (error) {
    console.error('Error sharing chat:', error);
    return json({ error: 'Failed to share chat' }, { status: 500 });
  }
};
