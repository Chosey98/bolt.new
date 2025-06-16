import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { getUserId } from '~/lib/auth.server';
import { prisma } from '~/lib/db.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);

  if (!userId) {
    return json({ chats: [] });
  }

  try {
    const chats = await prisma.chat.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return json({ chats });
  } catch (error) {
    console.error('Error fetching user chats:', error);
    return json({ chats: [] });
  }
};
