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
  pty: IPty,
  onData?: IInteractiveSpawn['onData'],
  outputContext?: string,
) => {
  const lines = data.split(/[\r\n]+/g).filter(Boolean);

  lines.forEach(line => {
    // We whitelist characters coming from the stdout pipe. Why? Because if we
    // dont, we get rogue characters that smash the terminal's readability and
    // we increase our reliability by handling only a handful of potential characters
    line = line.replace(/[^\w\s+_\.\,\-=:;\(\)\\\/\?\'\"]/gi, '');

    if (outputContext) {
      console.warn(`${outputContext} ${line}`);
    }
  
    else {
      console.warn(`${line}`);
    }
  
    const found = inputs.find(pair => line.indexOf(pair[0]) >= 0);
  
    if (found) {
      let input = found[1];
      if (typeof input === 'function') input = input(line);
      console.warn(`WRITING TO PTY, ${input.trim()}`);
      pty.write(input);
      inputs.splice(inputs.indexOf(found), 1);
    }
  
    if (onData) {
      onData(line);
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

  proc.on('data', (data: string) => {
    handleData(
      Buffer.from(data).toString('utf8'),
      options.inputs,
      proc,
      options.onData,
      options.outputContext
    );
  });

  return proc;
}

interactiveSpawn.ESC = String.fromCharCode(0x1B);
