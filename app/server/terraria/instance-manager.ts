import path from "path";
import Platform from 'platform-detect/os.mjs';
import shell from "shelljs";
import { IWorld } from "../../types/rest/world";
import { IWorldInternal } from "../types";
import { ITerrariaServerProcess, TerrariaServerProcess } from "./terraria-server-process";
import { WorldMetaData } from "./world-meta-data.store";

/**
 * This is the manager that creates new world instances and monitors
 */
export class InstanceManagerSingleton {
  private arch: string;
  private os: 'mac' | 'windows' | 'linux';
  private serverStartScriptPath: string = '';
  private serverExecutable: string = '';
  private initializing?: Promise<void>;
  private initialized: boolean = false;

  private runningProcesses: TerrariaServerProcess[] = [];

  /**
   * This initializes all needs to make the server executable on the machine AND will exmaine the
   * logs from a single world to determine which wworlds are available.
   */
  async init() {
    // If our instance management is set up then we don't need to init in any way
    if (this.initialized) return;

    // If we are initializing, we don't let something waiting for intiialization continue until it has finished
    if (this.initializing) {
      await this.initializing;
      return;
    }

    // Establish our initializing state
    let resolve: Function;
    const p = new Promise<void>(r => (resolve = r));
    this.initializing = p;

    // First we determine which operating system we're on.
    if (Platform.macos) this.os = 'mac';
    if (Platform.windows) this.os = 'windows';
    if (Platform.linux) this.os = 'linux';

    // Next we determine which node architecture is running so we'll run the same architecture build
    this.arch = require('os').arch();

    // Make sure our start script and executables are truly executable
    switch (this.os) {
      case 'mac': {
        this.serverStartScriptPath = path.resolve("binary/Mac/Terraria\\ Server.app/Contents/MacOS/TerrariaServer");
        this.serverExecutable = path.resolve("binary/Mac/Terraria\\ Server.app/Contents/MacOS/TerrariaServer.bin.osx");
        break;
      }

      case 'linux': {
        this.serverStartScriptPath = path.resolve("binary/Linux/TerrariaServer");
        const arch = this.arch === 'x64' ? '_x64' : '';
        this.serverExecutable = path.resolve(`binary/Linux/TerrariaServer.bin.x86_${arch}`);
        break;
      }

      case 'windows': {
        this.serverStartScriptPath = path.resolve("binary/Windows/start-server.bat");
        this.serverExecutable = path.resolve(`binary/Windows/TerrariaServer.exe`);
        break;
      }

      default: {
        console.warn(
          'It appears your platform is not windows, linux, or macos, which means its not supported'
        );
        process.exit(1);
      }
    }

    // Make sure our execution files are executable
    shell.chmod('755', this.serverStartScriptPath);
    shell.chmod('755', this.serverExecutable);
    // Set our pathing properly for our single process executables
    TerrariaServerProcess.serverStartScriptPath = this.serverStartScriptPath;
    TerrariaServerProcess.serverExecutable = this.serverExecutable;

    // Now fire up a server to read the list of worlds it has available
    console.warn('Syncing Meta Data...');
    const foundWorlds: string[] = [];

    // Start up a temporary process just to check with the server all of the worlds that have been
    // created and aere available.
    const syncProcess = this.newServerProcess({
      onData: (line: string) => {
        const worlds = line.match(/^([0-9]).+/gm);

        // This is our check expression for the initial server output to find the worlds it has available
        // to host. We use this to sync our meta data with what the server actually has as well as restart
        // any instances that we're flagged to be active when this manager was last shut down.
        if (worlds && worlds.length > 0) {
          worlds.forEach(world => {
            const worldName = world.match(/(?![0-9]).+/gm);

            if (worldName) {
              foundWorlds.push(worldName[0].trim());
            }
          });
        }

        // After all worlds have been broadcast, kill the process as we don't need to query it anymore
        if (line.indexOf('Choose World:') >= 0) {
          console.warn('Completed search for new worlds...');
          this.stopServerProcess(syncProcess);
          resolve();
        }
      }
   });

    await p;
    console.warn("Syncing worlds:", foundWorlds);
    WorldMetaData.sync(foundWorlds);
    console.warn('Completed syncing meta data!');

    // Next we start up any world that our meta data has listed as active
    WorldMetaData.data.forEach(world => {
      if (world.isActive) this.start(world);
    });

    delete this.initializing;
    this.initialized = true;
  }

  /**
   * Start a new terraria server and register it as a running process to track.
   */
  private newServerProcess(options: ITerrariaServerProcess): TerrariaServerProcess {
    const process = new TerrariaServerProcess(options);
    this.runningProcesses.push(process);
    return process;
  }

  /**
   * Stop and remove this process from the manager.
   */
  private stopServerProcess(process: TerrariaServerProcess) {
    const index = this.runningProcesses.indexOf(process);
    if (index >= 0) this.runningProcesses.splice(index, 1);
    process.stop();
  }

  /**
   * Creates a new world that can be accessed based on the input configuration. This will validate the operation
   * can occur. Will resolve to a result object that contains error messages.
   */
  async create(world: IWorld): Promise<{ success: boolean, error?: string }> {
    // Ensure initialization
    await this.init();

    return {
      success: false,
      error: 'NOT IMPLEMENTED',
    };
  }

  /**
   * This officially starts an instance of a server
   */
  async start(world: IWorldInternal): Promise<{ success: boolean, error?: string }> {
    this.newServerProcess({
      onData: (line: string) => {

      }
    });
    return {
      success: false,
      error: 'NOT IMPLEMENTED'
    };
  }

  async stop(world: IWorldInternal): Promise<{ success: boolean, error?: string }> {
    return {
      success: false,
      error: 'NOT IMPLEMENTED'
    };
  }
}

export const InstanceManager = new InstanceManagerSingleton();
