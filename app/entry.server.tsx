import type { AppLoadContext, EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import * as ReactDOMServer from 'react-dom/server';
import { renderHeadToString } from 'remix-island';
import { Head } from './root';
import { themeStore } from '~/lib/stores/theme';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  const head = renderHeadToString({ request, remixContext, Head });

  let html = ReactDOMServer.renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  if (isbot(request.headers.get('user-agent') || '')) {
    // For bots, we wait for all async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  html = `<!DOCTYPE html><html lang="en" data-theme="${themeStore.value}"><head>${head}</head><body><div id="root" class="w-full h-full">${html}</div></body></html>`;

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
  responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

  return new Response(html, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
