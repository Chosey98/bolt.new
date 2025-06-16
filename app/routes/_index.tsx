import { json, type MetaFunction, type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import { ChatStore } from '~/lib/stores/chat.server';
import { getUserId, hasAdminUser } from '~/lib/auth.server';
import { prisma } from '~/lib/db.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // check if admin user exists, if not redirect to setup
  const adminExists = await hasAdminUser();

  if (!adminExists) {
    return redirect('/setup');
  }

  const url = new URL(request.url);
  const chatId = url.searchParams.get('chatId');
  const userId = await getUserId(request);

  let chat = null;
  let user = null;

  if (chatId) {
    // check if user can access this chat
    const canAccess = await ChatStore.canAccessChat(chatId, userId || undefined);

    if (canAccess) {
      chat = await ChatStore.getChat(chatId);
    }
  }

  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
  }

  return json({
    chatId,
    userId,
    user,
    chat: chat
      ? {
          id: chat.id,
          messages: chat.messages,
          title: chat.title,
          isPublic: chat.isPublic,
          userId: chat.userId,
        }
      : null,
  });
};

export default function Index() {
  return (
    <div className="flex flex-col h-full w-full">
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
