import path from "path";
import Platform from 'platform-detect/os.mjs';
import shell from "shelljs";
import { IWorld } from "../../types/rest/world";
import { IWorldInternal } from "../types";

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

    // Now fire up a server to read the list of worlds it has available
    const childProcess = shell.exec(`${this.serverStartScriptPath}`, { async: true});
    console.log('Syncing Meta Data...');

    childProcess.on('data', (data: Buffer) => {
      const line = Buffer.from(data).toString();

      // This is our check expression for the initial server output to find the worlds it has available
      // to host. We use this to sync our meta data with what the server actually has as well as restart
      // any instances that we're flagged to be active when this manager was last shut down.
      if (line.match(/^([0-9]).+/gm)) {

      }

      // After all worlds have been broadcast, kill the process as we don't need to query it anymore
      if (line.indexOf('Choose World:') >= 0) {
        console.log('Completed syncing meta data...')
        childProcess.kill(0);
      }
    });

    await p;
    delete this.initializing;
    this.initialized = true;
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
    return {
      success: false,
      error: 'NOT IMPLEMENTED'
    };
  }
}

export const InstanceManager = new InstanceManagerSingleton();
