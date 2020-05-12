import { ChildProcess } from "child_process";
import colors from "colors/safe";
import fs from "fs-extra";
import { IPty } from "node-pty-prebuilt-multiarch";
import path from "path";
import shell from "shelljs";
import kill from "tree-kill";
import { IWorldInternal } from "../types";
import { interactiveSpawn } from "../util/interactive-spawn";

colors.setTheme({
  '0': ["black"],
  '1': ["red"],
  '2': ["green"],
  '3': ["yellow"],
  '4': ["blue"],
  '5': ["magenta"],
  '6': ["cyan"],
  '7': ["white"],
  '8': ["gray"],
});

let pickTheme = 0;

export interface ITerrariaServerProcess {
  /**
   * Handles responding to input questions for the process. Each item in this list will only be
   * handled a single time. Duplicate questions will be handled in the order they are insertted
   * into this list.
   */
  inputs?: [string, string | ((message: string) => string)][];
  /** Provides feedback on the process executing */
  onData?(data: string): void;
  /** Triggered if the process quits unexpectedly */
  onExit?(): void;
  /** The world this process is hosting. This is not set if the process is not hosting a world. */
  world?: IWorldInternal;
}

/**
 * Manages a single terraria server process
 */
export class TerrariaServerProcess {
  static serverStartScriptPath: string = '';
  static serverExecutables: string[] = [];

  private options: ITerrariaServerProcess;
  private childProcess?: ChildProcess;
  private childPty?: IPty;
  private onSaveEnd?: Function;
  private saveFinished?: Promise<void>;
  private isDead: boolean = false;
  private isStarted: boolean = false;
  private logStream?: fs.WriteStream;

  constructor(options: ITerrariaServerProcess) {
    this.options = options;
    this.startProcess();
  }

  keepActive() {
    if (this.options.world) this.options.world.isActive = true;
  }

  startedSuccessfully() {
    this.isStarted = true;
  }

  /**
   * The port this process is occupying
   */
  get port() {
    return this.options.world?.port || null;
  }

  /**
   * The name of the world this process is hosting
   */
  get name() {
    return this.options.world?.name || '';
  }

  /**
   * Starts the process
   */
  private startProcess() {
    this.startLogStream();
    if (this.options.inputs) this.startChildPty();
    else this.startChildProcess();
  }

  /**
   * This ensures we have a file to log to and creates a stream for us to output to.
   */
  private startLogStream() {
    if (this.options.world) {
      // We must create a log stream so we have a log file to write to to record the deeds of each server
      const logFilePath = path.resolve("logs", this.options.world.name);

      try {
        fs.ensureFileSync(logFilePath);
        this.logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

        // If something causes our file stream to close, we need to see if it SHOULD be closed or
        // if we are still logging. If we are logging still we need to re-ensure the file and rebuild the stream
        this.logStream.on('close', () => {
          delete this.logStream;
          if (this.isDead) return;
          this.startLogStream();
          console.warn('Rebuilding Log Stream');
        });
      }

      catch (err) {
        console.warn(
          'Could not establish a stream for the log file for the world starting up\n',
          logFilePath
        );
      }
    }
  }

  /**
   * Executes an arbitrary command on the Terraria server process if available.
   */
  command(cmd: string) {
    if (!this.isStarted) return;
    if (this.isDead) return;
    if (!this.childPty) {
      console.warn(`
        Attempted to trigger a ${cmd} on a Terraria Server instance but could not
        as it requires a Pty type instance to execute and this process is not
        running on Pty.
      `);
      return;
    }

    this.childPty.write(`${cmd}\n`);
  }

  /**
   * Tells the terraria server to execute a save and resolves when the save is assumed to have completed.
   */
  async save() {
    if (!this.isStarted) return;

    // Wait if a save operation is already taking place
    if (this.onSaveEnd && this.saveFinished) {
      await this.saveFinished;
      return;
    }

    // Must not be dead and must have a related world for saves to be relevant
    if (this.isDead || !this.options.world) return;
    let resolve;
    const p = new Promise<void>(r => (resolve = r));
    this.onSaveEnd = resolve;
    this.saveFinished = p;
    console.warn('Saving world', this.name);
    this.command('save');
    await p;
    delete this.onSaveEnd;
    delete this.saveFinished;
  }

  /**
   * Tells the terraria server to save then exit
   */
  async exit() {
    // Must not be dead and must have a related world for exits to be relevant
    if (this.isDead || !this.options.world) return;
    this.command('exit');
  }

  /**
   * Handles data that pipes in on stdout
   */
  private onData = (str: string) => {
    // If logging is available we log the data piped in.
    if (this.logStream) {
      const lines = str.split(/[\r\n]+/g).filter(Boolean);
      lines.forEach(line => {
        if (!this.logStream) return;
        this.logStream.write(`\n${new Date().toLocaleString('en-GB', { timeZone: 'UTC' })} -> `);
        this.logStream.write(line);
      });
    }

    // This is the routine for detecting when saving has completed. The server outputs "Validating world save"
    // when the save completes. Since the operation does not have a distinctive save output message, we will
    // simply wait for the validating message and wait a little bit of time to assume it's done. The validation
    // messages fire off sufficiently rapidly for this to be a decently "safe" approach.
    if (this.onSaveEnd) {
      if (str.indexOf('Backing up world file') >= 0) {
        console.warn('Save completed for', this.name);
        this.onSaveEnd?.();
      }
    }

    // Output the data piped from the process
    this.options.onData?.(str);
  }

  /**
   * Starts a Node Pty process to run the server to allow for strong cross platform input
   * manipulation to the process stream.
   */
  private async startChildPty() {
    if (!this.options.inputs) return;
    pickTheme++;
    pickTheme %= 9;
    const theme = `${pickTheme}`;

    this.childPty = await interactiveSpawn({
      inputs: this.options.inputs,
      cmd: `${TerrariaServerProcess.serverStartScriptPath}`,
      args: '',
      echo: false,
      onData: this.onData,
      outputContext: this.options.world ?
        // @ts-ignore The typings for colors does not reflect the custom theming the project allows for
        colors[theme](`${this.options.world.name}`) :
        undefined,
    });

    this.childPty.onExit(() => {
      this.isDead = true;
      this.options.onExit?.();
    });
  }

  /**
   * Starts a native Node child process to run the server
   */
  private startChildProcess() {
    this.childProcess = shell.exec(
      `${TerrariaServerProcess.serverStartScriptPath}`,
      { async: true}
    );

    if (!this.childProcess.stdout) {
      console.warn("Can not execute the Terraria Server as a child process");
      process.exit(1);
    }

    this.childProcess.stdout.on('data', (data: Buffer) => {
      const line = Buffer.from(data).toString();
      this.onData(line);
    });

    this.childProcess.on('exit', () => {
      this.options.onExit?.();
    });
  }

  /**
   * Fully kills this process
   */
  stop() {
    if (this.isDead) return;
    if (this.childProcess) kill(this.childProcess.pid);
    if (this.childPty) kill(this.childPty.pid);
    this.isDead = true;
  }
}
