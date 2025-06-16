import { json, type ActionFunctionArgs } from '@remix-run/node';
import { prisma } from '~/lib/db.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { actionId, messageId, chatId } = await request.json();

    if (!actionId || !messageId || !chatId) {
      return json({ error: 'actionId, messageId, and chatId are required' }, { status: 400 });
    }

    const executedAction = await prisma.executedAction.findUnique({
      where: {
        actionId_messageId_chatId: {
          actionId,
          messageId,
          chatId,
        },
      },
    });

    return json({ executed: !!executedAction });
  } catch (error) {
    console.error('Error checking action execution:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
