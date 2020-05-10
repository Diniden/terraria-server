import { ChildProcess } from "child_process";
import { IPty } from "node-pty-prebuilt-multiarch";
import shell from "shelljs";
import kill from "tree-kill";
import { interactiveSpawn } from "../util/interactive-spawn";

export interface ITerrariaServerProcess {
  /**
   * Handles responding to input questions for the process. Each item in this list will only be
   * handled a single time. Duplicate questions will be handled in the order they are insertted
   * into this list.
   */
  inputs?: [string, string | ((message: string) => string)][];
  /** Provides feedback on the process executing */
  onData?(data: string): void;
}

/**
 * Manages a single terraria server process
 */
export class TerrariaServerProcess {
  static serverStartScriptPath: string = '';
  static serverExecutable: string = '';

  private options: ITerrariaServerProcess;
  private childProcess?: ChildProcess;
  private childPty?: IPty;

  constructor(options: ITerrariaServerProcess) {
    this.options = options;
    this.startProcess();
  }

  /**
   * Starts the process
   */
  private startProcess() {
    if (this.options.inputs) this.startChildPty();
    else this.startChildProcess();
  }

  private command(cmd: string) {
    if (!this.childPty) {
      console.warn(`
        Attempted to trigger a ${cmd} on a Terraria Server instance but could not
        as it requires a Pty type instance to execute and this process is not
        running on Pty.
      `);
      return;
    }

    this.childPty.write(cmd);
  }

  /**
   * Tells the terraria server to execute a save
   */
  save() {
    this.command('save');
  }

  /**
   * Tells the terraria server to save then exit
   */
  exit() {
    this.command('exit');
  }

  /**
   * Handles data that pipes in on stdout
   */
  private onData = (str: string) => {
    if (this.options.onData) this.options.onData(str);
  }

  /**
   * Starts a Node Pty process to run the server to allow for strong cross platform input
   * manipulation to the process stream.
   */
  private async startChildPty() {
    if (!this.options.inputs) return;
    this.childPty = await interactiveSpawn({
      inputs: this.options.inputs,
      cmd: `${TerrariaServerProcess.serverStartScriptPath}`,
      args: '',
      echo: false,
      onData: this.onData
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
      this.onData?.(line);
    });
  }

  /**
   * Fully kills this process
   */
  stop() {
    if (this.childProcess) kill(this.childProcess.pid);
    if (this.childPty) kill(this.childPty.pid);
  }
}
