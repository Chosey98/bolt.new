import { type ActionFunctionArgs } from '@remix-run/node';
import Anthropic from '@anthropic-ai/sdk';
import { env } from 'node:process';
import { stripIndents } from '~/utils/stripIndent';

export async function action({ request }: ActionFunctionArgs) {
  const { message } = await request.json();

  const apiKey = env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Response('ANTHROPIC_API_KEY is required', { status: 500 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 8192,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: stripIndents`
          I want you to improve the user prompt that is wrapped in \`<original_prompt>\` tags.

          IMPORTANT: Only respond with the improved prompt and nothing else!

          <original_prompt>
            ${message}
          </original_prompt>
        `,
        },
      ],
    });

    const content = response.content[0];

    if (content.type === 'text') {
      return new Response(content.text, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }

    return new Response('No text content received', { status: 500 });
  } catch (error) {
    console.error('Enhancer API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
