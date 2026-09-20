import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';

export type ProcessResult = {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  interrupted: boolean;
};

/** Run an isolated row; bound hangs and reap its browser/worker process group. */
export async function runProcess(
  command: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    log: string;
    timeoutMs: number;
    signal?: AbortSignal;
  },
): Promise<ProcessResult> {
  const fd = openSync(options.log, 'w');
  try {
    return await new Promise((resolve, reject) => {
      const grouped = process.platform !== 'win32';
      const child = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        detached: grouped,
        stdio: ['ignore', fd, fd],
      });
      let timedOut = false;
      let interrupted = false;
      let forceTimer: ReturnType<typeof setTimeout> | undefined;
      const kill = (signal: NodeJS.Signals) => {
        if (!child.pid) return;
        try {
          process.kill(grouped ? -child.pid : child.pid, signal);
        } catch {
          /* Already exited. */
        }
      };
      const stop = () => {
        kill('SIGTERM');
        forceTimer ??= setTimeout(() => kill('SIGKILL'), 2000);
      };
      const abort = () => {
        interrupted = true;
        stop();
      };
      const timer = setTimeout(() => {
        timedOut = true;
        stop();
      }, options.timeoutMs);
      options.signal?.addEventListener('abort', abort, { once: true });
      if (options.signal?.aborted) abort();
      const cleanup = () => {
        clearTimeout(timer);
        clearTimeout(forceTimer);
        options.signal?.removeEventListener('abort', abort);
        // A shell or test worker can exit before its descendants do.
        if (grouped) kill('SIGKILL');
      };
      child.once('error', (error) => {
        cleanup();
        reject(error);
      });
      child.once('close', (exitCode, signal) => {
        cleanup();
        resolve({ exitCode, signal, timedOut, interrupted });
      });
    });
  } finally {
    closeSync(fd);
  }
}
