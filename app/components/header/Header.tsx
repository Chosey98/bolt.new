import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { useLoaderData, Form } from '@remix-run/react';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';

export function Header() {
  const chat = useStore(chatStore);
  const { userId, user } = useLoaderData<{
    userId: string | null;
    user: { isAdmin: boolean } | null;
    chat: any;
  }>();

  return (
    <header
      className={classNames(
        'flex items-center bg-bolt-elements-background-depth-1 p-5 border-b h-[var(--header-height)]',
        {
          'border-transparent': !chat.started,
          'border-bolt-elements-borderColor': chat.started,
        },
      )}
    >
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
        <div className="i-ph:sidebar-simple-duotone text-xl" />
        <a href="/" className="text-2xl font-semibold text-accent flex items-center">
          <span className="i-bolt:logo-text?mask w-[46px] inline-block" />
        </a>
      </div>
      <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
        <ClientOnly>{() => <ChatDescription />}</ClientOnly>
      </span>

      {/* Authentication UI */}
      <div className="flex items-center gap-3">
        {userId ? (
          <div className="flex gap-2">
            {user?.isAdmin && (
              <a
                href="/admin"
                className="px-3 py-1 text-sm bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text rounded"
              >
                Admin
              </a>
            )}
            <Form method="post" action="/logout">
              <button
                type="submit"
                className="px-3 py-1 text-sm bg-bolt-elements-button-secondary-background hover:bg-bolt-elements-button-secondary-backgroundHover text-bolt-elements-button-secondary-text rounded border border-bolt-elements-borderColor"
              >
                Logout
              </button>
            </Form>
          </div>
        ) : (
          <div className="flex gap-2">
            <a
              className="px-3 py-1 text-sm bg-bolt-elements-button-secondary-background hover:bg-bolt-elements-button-secondary-backgroundHover text-bolt-elements-button-secondary-text rounded border border-bolt-elements-borderColor"
              href="/login"
            >
              Login
            </a>
          </div>
        )}

        {chat.started && (
          <ClientOnly>
            {() => (
              <div className="ml-2">
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        )}
      </div>
    </header>
  );
}
