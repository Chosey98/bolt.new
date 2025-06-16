import { type ActionFunctionArgs } from '@remix-run/node';
import Anthropic from '@anthropic-ai/sdk';
import { env } from 'node:process';
import { getSystemPrompt } from '~/lib/.server/llm/prompts';
import { MAX_TOKENS } from '~/lib/.server/llm/constants';

export async function action({ request }: ActionFunctionArgs) {
  const { messages } = await request.json();

  const apiKey = env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Response('ANTHROPIC_API_KEY is required', { status: 500 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    // create a streaming response that follows the AI SDK data stream protocol
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.stream({
            model: 'claude-3-5-sonnet-20240620',
            system: getSystemPrompt(),
            max_tokens: MAX_TOKENS,
            temperature: 0,
            messages: messages.map((msg: any) => ({
              role: msg.role,
              content: msg.content,
            })),
          });

          for await (const chunk of response) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              // format as AI SDK data stream protocol: text part
              const textPart = `0:${JSON.stringify(chunk.delta.text)}\n`;
              controller.enqueue(new TextEncoder().encode(textPart));
            }
          }

          // send finish message
          const finishPart = `d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`;
          controller.enqueue(new TextEncoder().encode(finishPart));

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-vercel-ai-data-stream': 'v1',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });

    return new Response('Internal Server Error', { status: 500 });
  }
}
