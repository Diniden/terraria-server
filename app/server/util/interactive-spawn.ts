import { IPty, spawn } from 'node-pty-prebuilt-multiarch';

export interface IInteractiveSpawn {
  /** The root command to execute */
  cmd: string;
  /** The parameters to pass to the command as a single string */
  args: string;
  /**
   * A Record of messages the process will output that should trigger an input to be injected into
   * the stream
   */
  inputs: [string, string | ((message: string) => string)][];
  /** Set to true to cause the messages to stream to the parent's console. */
  echo: boolean;
  /** A header to apply to logs output to the console */
  outputContext?: string;

  /** Callback when data is available from the pty process */
  onData?(data: string): void;
}

const handleData = (
  data: string,
  inputs: [string, string | ((message: string) => string)][],
  ws: IPty,
  onData?: IInteractiveSpawn['onData'],
  outputContext?: string,
) => {
  if (outputContext) {
    process.stdout.write(`${outputContext} ${data}`);
  }

  else {
    process.stdout.write(data);
  }

  const line = Buffer.from(data).toString('utf8');
  const found = inputs.find(pair => line.indexOf(pair[0]) >= 0);

  if (found) {
    console.log('INPUT FOUND', line, found[0]);
    let input = found[1];
    if (typeof input === 'function') input = input(line);
    ws.write(input);
    inputs.splice(inputs.indexOf(found), 1);
  }

  if (onData) {
    onData(line);
  }
};

/**
 * Spawns a process that requires inputs. This will montior for messages and provide a specified response
 */
export async function interactiveSpawn(options: IInteractiveSpawn) {
  console.warn('Starting interactive command', options.cmd);
  const params = Array.isArray(options.args) ? options.args : `${options.args}`.split(/\s+/);

  const proc = spawn(options.cmd, params, {
    name: 'xterm-color',
    cwd: process.cwd(),
    env: process.env as Record<string, string>
  });

  proc.on('data', (data: string) => {
    handleData(
      data,
      options.inputs,
      proc,
      options.onData,
      options.outputContext
    );
  });

  return proc;
}

interactiveSpawn.ESC = String.fromCharCode(0x1B);
