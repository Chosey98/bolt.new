import { WebContainer } from '@webcontainer/api';
import { map, type MapStore } from 'nanostores';
import * as nodePath from 'node:path';
import type { BoltAction } from '~/types/actions';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import type { ActionCallbackData } from './message-parser';

const logger = createScopedLogger('ActionRunner');

// function to strip ANSI escape codes from terminal output
function stripAnsiCodes(text: string): string {
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\[[0-9]*[ABCD]/g, '')
    .replace(/\x1b\[[0-9]*[GK]/g, '');
}

export type ActionStatus = 'pending' | 'running' | 'complete' | 'aborted' | 'failed';

export type BaseActionState = BoltAction & {
  status: Exclude<ActionStatus, 'failed'>;
  abort: () => void;
  executed: boolean;
  abortSignal: AbortSignal;
  output?: string;
};

export type FailedActionState = BoltAction &
  Omit<BaseActionState, 'status'> & {
    status: Extract<ActionStatus, 'failed'>;
    error: string;
  };

export type ActionState = BaseActionState | FailedActionState;

type BaseActionUpdate = Partial<Pick<BaseActionState, 'status' | 'abort' | 'executed' | 'output'>>;

export type ActionStateUpdate =
  | BaseActionUpdate
  | (Omit<BaseActionUpdate, 'status'> & { status: 'failed'; error: string });

type ActionsMap = MapStore<Record<string, ActionState>>;

export class ActionRunner {
  #webcontainer: Promise<WebContainer>;
  #currentExecutionPromise: Promise<void> = Promise.resolve();

  actions: ActionsMap = map({});

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;
  }

  addAction(data: ActionCallbackData) {
    const { actionId } = data;

    const actions = this.actions.get();
    const action = actions[actionId];

    if (action) {
      // action already added
      return;
    }

    const abortController = new AbortController();

    this.actions.setKey(actionId, {
      ...data.action,
      status: 'pending',
      executed: false,
      output: '',
      abort: () => {
        abortController.abort();
        this.#updateAction(actionId, { status: 'aborted' });
      },
      abortSignal: abortController.signal,
    });

    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: 'running' });
    });
  }

  async runAction(data: ActionCallbackData) {
    const { actionId } = data;
    const action = this.actions.get()[actionId];

    if (!action) {
      unreachable(`Action ${actionId} not found`);
    }

    if (action.executed) {
      return;
    }

    this.#updateAction(actionId, { ...action, ...data.action, executed: true });

    this.#currentExecutionPromise = this.#currentExecutionPromise
      .then(() => {
        return this.#executeAction(actionId);
      })
      .catch((error) => {
        console.error('Action failed:', error);
      });
  }

  async #executeAction(actionId: string) {
    const action = this.actions.get()[actionId];

    this.#updateAction(actionId, { status: 'running' });

    try {
      switch (action.type) {
        case 'shell': {
          await this.#runShellAction(actionId, action);
          break;
        }
        case 'file': {
          await this.#runFileAction(action);
          break;
        }
      }

      this.#updateAction(actionId, { status: action.abortSignal.aborted ? 'aborted' : 'complete' });
    } catch (error) {
      this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });

      // re-throw the error to be caught in the promise chain
      throw error;
    }
  }

  async #runShellAction(actionId: string, action: ActionState) {
    if (action.type !== 'shell') {
      unreachable('Expected shell action');
    }

    const webcontainer = await this.#webcontainer;

    // check if this is a long-running command that should run in background
    const isLongRunningCommand = this.#isLongRunningCommand(action.content);

    const process = await webcontainer.spawn('jsh', ['-c', action.content], {
      env: { npm_config_yes: true },
    });

    action.abortSignal.addEventListener('abort', () => {
      process.kill();
    });

    let output = '';

    process.output.pipeTo(
      new WritableStream({
        write: (data) => {
          // strip ANSI escape codes and clean up the output
          const cleanData = stripAnsiCodes(data);
          output += cleanData;
          console.log(data);

          // update the action with the current output in real-time
          this.#updateAction(actionId, { output: output.trim() });
        },
      }),
    );

    if (isLongRunningCommand) {
      // for long-running commands, don't wait for exit - let them run in background
      logger.debug(`Started long-running command in background: ${action.content}`);

      // give it a moment to start up and show initial output
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // mark as complete even though it's still running
      return;
    } else {
      // for regular commands, wait for completion
      const exitCode = await process.exit;
      logger.debug(`Process terminated with code ${exitCode}`);
    }
  }

  #isLongRunningCommand(command: string): boolean {
    const longRunningCommands = [
      'npm run dev',
      'npm start',
      'yarn dev',
      'yarn start',
      'pnpm dev',
      'pnpm start',
      'vite',
      'next dev',
      'ng serve',
      'serve',
      'python -m http.server',
      'python3 -m http.server',
      'php -S',
      'ruby -run -e httpd',
    ];

    const normalizedCommand = command.trim().toLowerCase();

    return longRunningCommands.some((longRunningCmd) => normalizedCommand.includes(longRunningCmd.toLowerCase()));
  }

  async #runFileAction(action: ActionState) {
    if (action.type !== 'file') {
      unreachable('Expected file action');
    }

    const webcontainer = await this.#webcontainer;

    let folder = nodePath.dirname(action.filePath);

    // remove trailing slashes
    folder = folder.replace(/\/+$/g, '');

    if (folder !== '.') {
      try {
        await webcontainer.fs.mkdir(folder, { recursive: true });
        logger.debug('Created folder', folder);
      } catch (error) {
        logger.error('Failed to create folder\n\n', error);
      }
    }

    try {
      await webcontainer.fs.writeFile(action.filePath, action.content);
      logger.debug(`File written ${action.filePath}`);
    } catch (error) {
      logger.error('Failed to write file\n\n', error);
    }
  }

  #updateAction(id: string, newState: ActionStateUpdate) {
    const actions = this.actions.get();

    this.actions.setKey(id, { ...actions[id], ...newState });
  }
}
