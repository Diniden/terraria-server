// @ts-ignore
import { spawn } from 'node-pty-prebuilt-multiarch';

import { WriteStream } from 'fs';
import os = require('os');

const handleData = (
  data: Buffer,
  searches: string[],
  inputs: Record<string, string | ((message: string) => string)>,
  ws: WriteStream,
  echo: boolean
) => {
  process.stdout.write(data);
  const line = Buffer.from(data).toString('utf8');

  searches.forEach((s) => {
    if (line.indexOf(s) >= 0) {
      let input = inputs[s];
      if (typeof input === 'function') input = input(line);
      ws.write(input);
      if (echo) process.stdout.write(input);
    }
  });
};

/**
 * Spawns a process that requires inputs. This will montior for messages and provide a specified response
 *
 * @param cmd The root command to execute
 * @param args The parameters to pass to the command as a single string
 * @param inputs A Record of messages the process will output that should trigger an input to be injected into
 *               the stream
 * @param echo Set to true to cause the messages to stream to the parent's console.
 */
async function interactiveSpawn(cmd: string, args: string, inputs: Record<string, string>, echo: boolean) {
  let resolve: Function;
  let reject: Function;
  const p = new Promise((rs, rj) => { resolve = rs; reject = rj; });
  console.warn('Starting command', cmd);

  const params = Array.isArray(args) ? args : `${args}`.split(/\s+/);

  const proc = spawn(cmd, params, {
    name: 'xterm-color',
    cwd: process.cwd(),
    env: process.env
  });

  const searches = Object.keys(inputs);
  proc.on('data', (data: Buffer) => handleData(data, searches, inputs, proc, echo));

  proc.on('close', () => {
    console.warn('Finished processing command', cmd);
    resolve();
  });

  await p;
}

interactiveSpawn.ESC = String.fromCharCode(0x1B);
module.exports = interactiveSpawn;
