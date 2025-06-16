import { json, type ActionFunctionArgs } from '@remix-run/node';
import { prisma } from '~/lib/db.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { actionId, messageId, chatId, actionType, content, status, output } = await request.json();

    if (!actionId || !messageId || !chatId || !actionType || !content || !status) {
      return json(
        { error: 'actionId, messageId, chatId, actionType, content, and status are required' },
        { status: 400 },
      );
    }

    await prisma.executedAction.upsert({
      where: {
        actionId_messageId_chatId: {
          actionId,
          messageId,
          chatId,
        },
      },
      update: {
        status,
        output,
      },
      create: {
        actionId,
        messageId,
        chatId,
        actionType,
        content,
        status,
        output,
      },
    });

    return json({ success: true });
  } catch (error) {
    console.error('Error marking action as executed:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
