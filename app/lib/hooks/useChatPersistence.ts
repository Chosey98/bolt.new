import { useEffect, useState } from 'react';
import type { Message } from 'ai';
import { useLoaderData } from '@remix-run/react';
import { nanoid } from 'nanoid';

export function useChatPersistence() {
  const { chatId, chat } = useLoaderData<{ chatId: string | null; chat: any }>();
  const [ready, setReady] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId);

  // initialize with messages from server if available
  const initialMessages: Message[] = chat?.messages || [];

  useEffect(() => {
    setReady(true);
  }, []);

  const storeMessageHistory = async (messages: Message[]) => {
    if (messages.length === 0) {
      return;
    }

    let chatIdToUse = currentChatId;

    // generate new chat ID if we don't have one
    if (!chatIdToUse) {
      chatIdToUse = nanoid();
      setCurrentChatId(chatIdToUse);

      // update URL with new chat ID
      const url = new URL(window.location.href);
      url.searchParams.set('chatId', chatIdToUse);
      window.history.replaceState({}, '', url.toString());
    }

    // save to server
    try {
      const response = await fetch('/api/chat-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chatIdToUse,
          messages,
          title: messages[0]?.content?.slice(0, 50) || 'New Chat',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save chat');
      }
    } catch (error) {
      console.error('Error saving chat:', error);
      throw error;
    }
  };

  return {
    ready,
    initialMessages,
    storeMessageHistory,
  };
}
