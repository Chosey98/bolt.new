import { useStore } from '@nanostores/react';
import { useLoaderData } from '@remix-run/react';
import { toast } from 'react-toastify';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';

interface HeaderActionButtonsProps {}

export function HeaderActionButtons({}: HeaderActionButtonsProps) {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const { showChat } = useStore(chatStore);
  const { userId, chat } = useLoaderData<{ userId: string | null; chat: any }>();

  const canHideChat = showWorkbench || !showChat;
  const canShare = chat && chat.id && userId && chat.userId === userId;

  const handleShare = async () => {
    if (!chat || !chat.id) {
      toast.error('No chat to share');
      return;
    }

    try {
      // make the chat public
      const response = await fetch('/api/share-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chat.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to share chat');
      }

      // copy the shareable link to clipboard
      const shareUrl = `${window.location.origin}/?chatId=${chat.id}`;
      await navigator.clipboard.writeText(shareUrl);

      toast.success('Chat link copied to clipboard! Anyone can now view this chat.');
    } catch (error) {
      console.error('Error sharing chat:', error);
      toast.error('Failed to share chat');
    }
  };

  return (
    <div className="flex gap-2">
      {canShare && (
        <Button onClick={handleShare} title="Share chat">
          <div className="i-ph:arrow-right text-sm" />
        </Button>
      )}
      <div className="flex border border-bolt-elements-borderColor rounded-md overflow-hidden">
        <Button
          active={showChat}
          disabled={!canHideChat}
          onClick={() => {
            if (canHideChat) {
              chatStore.setKey('showChat', !showChat);
            }
          }}
        >
          <div className="i-bolt:chat text-sm" />
        </Button>
        <div className="w-[1px] bg-bolt-elements-borderColor" />
        <Button
          active={showWorkbench}
          onClick={() => {
            if (showWorkbench && !showChat) {
              chatStore.setKey('showChat', true);
            }

            workbenchStore.showWorkbench.set(!showWorkbench);
          }}
        >
          <div className="i-ph:code-bold" />
        </Button>
      </div>
    </div>
  );
}

interface ButtonProps {
  active?: boolean;
  disabled?: boolean;
  children?: any;
  onClick?: VoidFunction;
  title?: string;
}

function Button({ active = false, disabled = false, children, onClick, title }: ButtonProps) {
  return (
    <button
      className={classNames('flex items-center p-1.5', {
        'bg-bolt-elements-item-backgroundDefault hover:bg-bolt-elements-item-backgroundActive text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary':
          !active,
        'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent': active && !disabled,
        'bg-bolt-elements-item-backgroundDefault text-alpha-gray-20 dark:text-alpha-white-20 cursor-not-allowed':
          disabled,
      })}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}
