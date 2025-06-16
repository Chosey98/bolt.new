import { streamText as _streamText, generateText as _generateText, convertToCoreMessages } from 'ai';
import { getAPIKey } from '~/lib/.server/llm/api-key';
import { getAnthropicModel } from '~/lib/.server/llm/model';
import { MAX_TOKENS } from './constants';
import { getSystemPrompt } from './prompts';

interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolResult<string, unknown, unknown>[];
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

export function streamText(
  messages: Messages,
  env?: { ANTHROPIC_API_KEY?: string; [key: string]: any },
  options?: StreamingOptions,
) {
  const apiKey = getAPIKey(env);

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }

  return _streamText({
    model: getAnthropicModel(apiKey),
    system: getSystemPrompt(),
    maxTokens: MAX_TOKENS,
    headers: {
      'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15',
    },
    messages: convertToCoreMessages(messages),
    ...options,
  });
}

export function generateText(
  messages: Messages,
  env?: { ANTHROPIC_API_KEY?: string; [key: string]: any },
  options?: StreamingOptions,
) {
  const apiKey = getAPIKey(env);

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }

  return _generateText({
    model: getAnthropicModel(apiKey),
    system: getSystemPrompt(),
    maxTokens: MAX_TOKENS,
    headers: {
      'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15',
    },
    messages: convertToCoreMessages(messages),
    ...options,
  });
}
