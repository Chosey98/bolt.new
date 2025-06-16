import { json, type ActionFunctionArgs } from '@remix-run/node';
import { getUserId } from '~/lib/auth.server';
import { ChatStore } from '~/lib/stores/chat.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'DELETE') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const userId = await getUserId(request);

  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const chatId = formData.get('chatId')?.toString();

    if (!chatId) {
      return json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // check if user can access this chat (owns it)
    const canAccess = await ChatStore.canAccessChat(chatId, userId);

    if (!canAccess) {
      return json({ error: 'Chat not found or access denied' }, { status: 404 });
    }

    // get the chat to verify ownership
    const chat = await ChatStore.getChat(chatId);

    if (!chat || chat.userId !== userId) {
      return json({ error: 'You can only delete your own chats' }, { status: 403 });
    }

    // delete the chat
    await ChatStore.deleteChat(chatId);

    return json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return json({ error: 'Failed to delete chat' }, { status: 500 });
  }
};
