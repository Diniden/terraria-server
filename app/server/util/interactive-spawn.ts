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

const handleData = async (
  data: string,
  inputs: IInteractiveSpawn['inputs'],
  pty: IPty,
  onData?: IInteractiveSpawn['onData'],
  outputContext?: string,
) => {
  const lines = data.split(/[\r\n]+/g).filter(Boolean);

  lines.forEach(line => {
    // We whitelist characters coming from the stdout pipe. Why? Because if we
    // dont, we get rogue characters that smash the terminal's readability and
    // we increase our reliability by handling only a handful of potential characters
    line = line.replace(/[^\w\s+_\_\.\,\-=:;\(\)\\\/\?\'\"]/gi, '');

    if (outputContext) {
      console.warn(`${outputContext} ${line}`);
    }

    else {
      console.warn(`${line}`);
    }

    const found = inputs.find(pair => line.indexOf(pair[0]) >= 0);

    if (onData) {
      onData(line);
    }

    if (found) {
      let input = found[1];
      if (typeof input === 'function') input = input(line);
      console.warn(`WRITING TO PTY, ${input.trim()}`);
      pty.write(input);
      inputs.splice(inputs.indexOf(found), 1);
    }
  });
};

/**
 * Spawns a process that requires inputs. This will montior for messages and provide a specified response
 */
export async function interactiveSpawn(options: IInteractiveSpawn) {
  console.warn('Starting interactive command', options.cmd);
  console.warn('Input controls', options.inputs);
  const params = Array.isArray(options.args) ? options.args : `${options.args}`.split(/\s+/);

  const proc = spawn(options.cmd, params, {
    name: 'xterm-color',
    cwd: process.cwd(),
    env: process.env as Record<string, string>
  });

  let timer: NodeJS.Timeout;
  let info = "";

  proc.on('data', (data: string) => {
    info += Buffer.from(data).toString('utf8');

    // We debounce a tiny bit here because sometimes it takes a hair for our process to flush the
    // buffer completely so you can get lines that are split up in odd ways
    clearTimeout(timer);
    timer = setTimeout(() => {
      handleData(
        info,
        options.inputs,
        proc,
        options.onData,
        options.outputContext
      );
      info = '';
    }, 10);
  });

  return proc;
}

interactiveSpawn.ESC = String.fromCharCode(0x1B);
