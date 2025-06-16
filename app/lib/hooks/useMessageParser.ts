import type { Message } from 'ai';
import { useCallback, useState } from 'react';
import { StreamingMessageParser } from '~/lib/runtime/message-parser';
import { workbenchStore } from '~/lib/stores/workbench';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('useMessageParser');

async function markActionExecuted(
  actionId: string,
  messageId: string,
  chatId: string,
  actionType: string,
  content: string,
  status: string,
  output?: string,
): Promise<void> {
  try {
    await fetch('/api/mark-action-executed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId, messageId, chatId, actionType, content, status, output }),
    });
  } catch (error) {
    logger.error('Failed to mark action as executed:', error);
  }
}

export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useState<{ [key: number]: string }>({});

  const parseMessages = useCallback((messages: Message[], isLoading: boolean, shouldExecuteActions: boolean = true) => {
    // create a fresh parser for each parse to avoid state issues
    const messageParser = new StreamingMessageParser({
      shouldExecuteActions,
      callbacks: {
        onArtifactOpen: (data) => {
          logger.trace('onArtifactOpen', data);
          workbenchStore.showWorkbench.set(true);
          workbenchStore.addArtifact(data);
        },
        onArtifactClose: (data) => {
          logger.trace('onArtifactClose');
          workbenchStore.updateArtifact(data, { closed: true });
        },
        onActionOpen: (data) => {
          logger.trace('onActionOpen', data.action);

          // we only add shell actions when when the close tag got parsed because only then we have the content
          if (data.action.type !== 'shell') {
            workbenchStore.addAction(data);
          }
        },
        onActionClose: (data) => {
          logger.trace('onActionClose', data.action);

          if (data.action.type === 'shell') {
            workbenchStore.addAction(data);
          }

          // always execute actions - WebContainer environment resets on page refresh
          workbenchStore.runAction(data);

          // only mark as executed for new messages to prevent duplicate database entries
          if (shouldExecuteActions) {
            markActionExecuted(
              data.actionId,
              data.messageId,
              data.artifactId,
              data.action.type,
              data.action.content,
              'completed',
            ).catch((error) => {
              logger.error('Failed to mark action as executed:', error);
            });
          }
        },
      },
    });

    // reset parser state in development
    if (import.meta.env.DEV && !isLoading) {
      messageParser.reset();
    }

    // parse all messages fresh
    const newParsedMessages: { [key: number]: string } = {};

    for (const [index, message] of messages.entries()) {
      if (message.role === 'assistant') {
        const parsedContent = messageParser.parse(message.id, message.content);
        newParsedMessages[index] = parsedContent;
      }
    }

    setParsedMessages(newParsedMessages);
  }, []);

  return { parsedMessages, parseMessages };
}
