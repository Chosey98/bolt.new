import type { Message } from 'ai';
import { prisma } from '~/lib/db.server';

interface ChatData {
  id: string;
  messages: Message[];
  title?: string;
  isPublic: boolean;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ChatStore {
  static async saveChat(id: string, messages: Message[], title?: string, userId?: string) {
    /**
     * Convert AI messages to database format.
     */
    const dbMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    /**
     * Check if chat exists.
     */
    const existingChat = await prisma.chat.findUnique({
      where: { id },
    });

    if (existingChat) {
      /**
       * Update existing chat.
       * First delete existing messages.
       */
      await prisma.message.deleteMany({
        where: { chatId: id },
      });

      /**
       * Then create new messages.
       */
      await prisma.message.createMany({
        data: dbMessages.map((msg: { role: string; content: string }) => ({
          ...msg,
          chatId: id,
        })),
      });

      /**
       * Update chat metadata.
       */
      const chat = await prisma.chat.update({
        where: { id },
        data: {
          title: title || 'New Chat',
          updatedAt: new Date(),
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return chat;
    } else {
      /**
       * Create new chat.
       */
      const chat = await prisma.chat.create({
        data: {
          id,
          title: title || 'New Chat',
          userId,
          isPublic: !userId,
          messages: {
            create: dbMessages,
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return chat;
    }
  }

  static async getChat(id: string): Promise<ChatData | null> {
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!chat) {
      return null;
    }

    // convert database messages to AI format
    const messages: Message[] = chat.messages.map((msg: any) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      createdAt: msg.createdAt,
    }));

    return {
      id: chat.id,
      messages,
      title: chat.title || undefined,
      isPublic: chat.isPublic,
      userId: chat.userId || undefined,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }

  static async getAllChats(userId?: string): Promise<ChatData[]> {
    const chats = await prisma.chat.findMany({
      where: userId ? { userId } : { isPublic: true },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return chats.map((chat: any) => ({
      id: chat.id,
      messages: chat.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        createdAt: msg.createdAt,
      })),
      title: chat.title || undefined,
      isPublic: chat.isPublic,
      userId: chat.userId || undefined,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    }));
  }

  static async deleteChat(id: string, userId?: string): Promise<boolean> {
    try {
      const whereClause = userId ? { id, userId } : { id, isPublic: true };

      await prisma.chat.delete({
        where: whereClause,
      });

      return true;
    } catch {
      return false;
    }
  }

  static generateChatId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  static async canAccessChat(chatId: string, userId?: string): Promise<boolean> {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { isPublic: true, userId: true },
    });

    if (!chat) {
      return false;
    }

    // public chats can be accessed by anyone
    if (chat.isPublic) {
      return true;
    }

    // private chats can only be accessed by the owner
    return chat.userId === userId;
  }

  static async makeChatPublic(chatId: string): Promise<void> {
    await prisma.chat.update({
      where: { id: chatId },
      data: { isPublic: true },
    });
  }
}
