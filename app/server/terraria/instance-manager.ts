import path from "path";
import Platform from 'platform-detect/os.mjs';
import shell from "shelljs";
import { IWorld } from "../../types/rest/world";
import { WORLD_CONFIG } from "../config/world.config";
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
  private serverExecutables: string[] = [];
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
        this.serverStartScriptPath = path.resolve("binary/Mac/TerrariaServer.app/Contents/MacOS/TerrariaServer");
        this.serverExecutables = [path.resolve("binary/Mac/TerrariaServer.app/Contents/MacOS/TerrariaServer.bin.osx")];
        break;
      }

      case 'linux': {
        this.serverStartScriptPath = path.resolve("binary/Linux/TerrariaServer");
        this.serverExecutables = [
          path.resolve(`binary/Linux/TerrariaServer.bin.x86_64`),
          path.resolve(`binary/Linux/TerrariaServer.bin.x86`),
        ];
        break;
      }

      case 'windows': {
        this.serverStartScriptPath = path.resolve("binary/Windows/start-server.bat");
        this.serverExecutables = [path.resolve(`binary/Windows/TerrariaServer.exe`)];
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
    this.serverExecutables.forEach(exe => shell.chmod('755', exe));
    // Set our pathing properly for our single process executables
    TerrariaServerProcess.serverStartScriptPath = this.serverStartScriptPath;
    TerrariaServerProcess.serverExecutables = this.serverExecutables;

    console.warn(`
      Terraria start script detected:
      ${TerrariaServerProcess.serverStartScriptPath}
    `);

    // Now fire up a server to read the list of worlds it has available
    console.warn('Syncing Meta Data...');
    const foundWorlds: string[] = [];

    // Make a new sync id check
    const syncIds = this.createSyncIdParser(foundWorlds, () => {
      console.warn('\nCompleted search for new worlds...');
      this.stopServerProcess(syncProcess);
      resolve();
    });

    // Start up a temporary process just to check with the server all of the worlds that have been
    // created and aere available.
    const syncProcess = this.newServerProcess({
      onData: (line: string) => {
        syncIds(line);
      }
   });

    await p;

    // Check for duplicate worlds in the server
    foundWorlds.sort();
    foundWorlds.reduce((p, n) => {
      if (p === n) {
        console.warn(`
          The manager currently does NOT support Terraria hosts that have
          duplicate world names. You will have to clean up your world listing
          before running this manager again.
        `);
        process.exit(1);
      }

      return n;
    }, '');

    console.warn("Syncing worlds:", foundWorlds);
    WorldMetaData.sync(foundWorlds);
    WorldMetaData.save();
    console.warn('Completed syncing meta data!');

    // Next we start up any world that our meta data has listed as active so all worlds
    // that were running last run are booted up again.
    for (const world of WorldMetaData.data) {
      if (world.isActive) {
        // For start up, we have to set the world active to false so it can start.
        // It's not valid to start a world already active.
        world.isActive = false;
        // Start the world on bootup!
        await this.start(world);
      }
    };

    delete this.initializing;
    this.initialized = true;
  }

  /**
   * Due to the server listing it's worlds in a sorted order, everytime the worlds are output
   * and listed by the server, we should use that as an opportunity to sync the load ids of
   * the worlds.
   */
  private createSyncIdParser(outNames?: string[], onFinish?: Function) {
    const names: string[] = outNames || [];
    let done = false;

    return (data: string) => {
      if (done) return true;
      const worlds = data.match(/^([0-9]).+/gm);

      // This is our check expression for the initial server output to find the worlds it has available
      // to host. We use this to sync our meta data with what the server actually has as well as restart
      // any instances that we're flagged to be active when this manager was last shut down.
      if (worlds && worlds.length > 0) {
        worlds.forEach(world => {
          const worldName = world.match(/(?![0-9]).+/gm);

          if (worldName) {
            names.push(worldName[0].trim());
          }
        });
      }

      if (data.indexOf('Choose World:') >= 0) {
        done = true;
        onFinish?.();
      }

      return false;
    };
  }

  /**
   * Parses server data for indication that the server has started and is ready to accept users.
   */
  private createServerStartedParser(world: IWorldInternal, timeout: NodeJS.Timeout, resolve?: Function) {
    let complete = false;

    return (data: string) => {
      if (!complete && data.indexOf("Type 'help' for a list of commands.") >= 0) {
        clearTimeout(timeout);
        world.isActive = true;
        console.warn('The world', world.name, 'has successfully started');
        resolve?.();
        complete = true;
      }

      return complete;
    };
  }

  /**
   * Parses server data for indication of users joining and leaving
   */
  private createOnlineParser(world: IWorldInternal) {
    return (data: string) => {
      if (data.indexOf("has joined") >= 0) {
        world.online++;
      }

      if (data.indexOf("has left") >= 0) {
        world.online--;
      }

      // This process never completes
      return false;
    };
  }

  /**
   * Discovers an unused port to start up a server. If this returns null, then all available
   * ports this server is configured to use have been utilized.
   */
  private getAvailablePort(): number | null {
    const startPort = WORLD_CONFIG.portRange[0];
    const endPort = WORLD_CONFIG.portRange[1] + 1;
    const usedPorts = new Set<number>();

    this.runningProcesses.forEach(process => {
      usedPorts.add(process.port || -1);
    });

    for (let i = startPort; i < endPort; ++i) {
      if (usedPorts.has(i)) continue;
      return i;
    }

    return null;
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
  private async stopServerProcess(process: TerrariaServerProcess) {
    const index = this.runningProcesses.indexOf(process);
    if (index >= 0) this.runningProcesses.splice(index, 1);
    await process.save();
    process.stop();
  }

  /**
   * Creates a new world that can be accessed based on the input configuration. This will validate the operation
   * can occur. Will resolve to a result object that contains error messages.
   */
  async create(world: IWorldInternal): Promise<{ success: boolean, error?: string }> {
    // Validate starting up this new world
    const invalid = await this.validateStartUp(world);
    if (invalid) return invalid;

    console.warn('Creating a new world:', world.name);
    let resolve: Function | undefined;
    const p = new Promise(r => (resolve = r));
    let success = true;
    let error;

    // Start up a timeout to stop the start up process if it's taking too long. This is
    // currently our only form of error handling for the situation.
    const timeout = setTimeout(async () => {
      success = false;
      error = `
        ERROR: Could not create the specified world in less than
        ${WORLD_CONFIG.worldStartTimeout}ms. We will assume something bad has
        happened and you should check the server logs. If nothing bad has
        happened, you should increase the creation timeout in the
        configuration (WORLD_CREATE_TIMEOUT or worldCreateTimeout).
      `;
      console.warn(error);

      if (server) {
        await this.stopServerProcess(server);
      }
    }, WORLD_CONFIG.worldStartTimeout);

    const sizePick: {[key in IWorld['size']]: number} = {
      Small: 1,
      Medium: 2,
      Large: 3,
      Unknown: 1,
    };

    const difficultyPick: {[key in IWorld['difficulty']]: number} = {
      Normal: 1,
      Expert: 2,
      Extreme: 3,
      Unknown: 1,
    };

    // Make our sync id process to use while processing our new server
    const syncIds = this.createSyncIdParser();
    const serverStart = this.createServerStartedParser(world, timeout, resolve);
    const playerConnection = this.createOnlineParser(world);

    // Start up the server and answer all of the initialization questions
    const server = this.newServerProcess({
      world,
      inputs: [
        ['Choose World:', `n\n`],
        ['Choose size:', `${sizePick[world.size]}\n`],
        ['Choose Difficulty:', `${difficultyPick[world.difficulty]}\n`],
        ['Enter world name:', `${world.name}\n`],
        ['Choose World:', `${world.loadId}\n`],
        ['Max players (press enter for 8):', `${world.maxPlayers}\n`],
        ['Server port (press enter for 7777):', `${world.port}\n`],
        ['Automatically forward port? (y/n):', `n\n`],
        ['Server password (press enter for none):', `${world.password}\n`],
      ],

      onData: (line: string) => {
        syncIds(line);

        if (serverStart(line)) {
          playerConnection(line);
        }
      },

      onExit: async () => {
        this.stopServerProcess(server);
      }
    });

    await p;
    WorldMetaData.save();

    return {
      success,
      error,
    };
  }

  /**
   * This officially starts an instance of a server
   */
  async start(world: IWorldInternal): Promise<{ success: boolean, error?: string }> {
    // Validate starting up this new world
    const invalid = await this.validateStartUp(world);
    if (invalid) return invalid;

    console.warn('Starting world:', world.name);
    let resolve: Function | undefined;
    const p = new Promise(r => (resolve = r));
    let success = false;
    let error;

    // Start up a timeout to stop the start up process if it's taking too long. This is
    // currently our only form of error handling for the situation.
    const timeout = setTimeout(() => {
      success = false;
      error = `
        ERROR: Could not start the specified world in less than
        ${WORLD_CONFIG.worldStartTimeout}ms. We will assume something bad has
        happened and you should check the server logs. If nothing bad has
        happened, you should increase the start up timeout in the
        configuration (WORLD_START_TIMEOUT or worldStartTimeout).
      `;
      console.warn(error);

      if (server) {
        this.stopServerProcess(server);
      }
    }, WORLD_CONFIG.worldStartTimeout);

    // Make our sync id process to use while processing our new server
    const syncIds = this.createSyncIdParser();
    const serverStart = this.createServerStartedParser(world, timeout, resolve);
    const playerConnection = this.createOnlineParser(world);

    // Start up the server and answer all of the initialization questions
    const server = this.newServerProcess({
      world,
      inputs: [
        ['Choose World:', `${world.loadId}\n`],
        ['Max players (press enter for 8):', `${world.maxPlayers}\n`],
        ['Server port (press enter for 7777):', `${world.port}\n`],
        ['Automatically forward port? (y/n):', `n\n`],
        ['Server password (press enter for none):', `${world.password}\n`],
      ],

      onData: (line: string) => {
        syncIds(line);

        if (serverStart(line)) {
          playerConnection(line);
        }
      },

      onExit: () => {
        this.stopServerProcess(server);
      }
    });

    await p;
    // setTimeout(() => {
    //   server.save();
    // }, 20000);
    WorldMetaData.save();

    return {
      success,
      error
    };
  }

  /**
   * This halts an instance of terraria and frees up the port in use and slot for use
   */
  async stop(world: IWorldInternal): Promise<{ success: boolean, error?: string }> {
    const process = this.runningProcesses.find(p => p.name === world.name);

    if (!process) {
      return {
        success: false,
        error: `
          Could not stop the process for world ${world.name} as the world was
          not found in the list of active worlds.
        `
      };
    }

    // Tell the server process to shut down gracefully
    this.stopServerProcess(process);

    return {
      success: true,
    };
  }

  /**
   * This saves and stops ALL running processes
   */
  async stopAll(keepActive: boolean = false) {
    console.warn("Stopping all servers. Will stay active?", keepActive);
    // Stop each running server one by one and allowing it to save and quit
    for (const process of this.runningProcesses.slice(0)) {
      await this.stopServerProcess(process);

      if (keepActive) {
        process.keepActive();
      }
    }
  }

  /**
   * This checks to see if a world CAN be started by performing some common property checks
   * before starting up the world.
   */
  private async validateStartUp(world: IWorldInternal) {
    await this.init();

    // Can not start up an active world
    if (world.isActive) {
      return {
        success: false,
        error: `
          The world specified to be activated is already active!
        `
      };
    }

    // Make sure we have room to start up another world. This checks against the server configuration
    // for how many worlds are allowed in total.
    if (this.runningProcesses.length >= WORLD_CONFIG.maxWorlds) {
      return {
        success: false,
        error: `
          There are already too many active worlds for this HOST. Please
          deactivate a server first before attempting to start a new one.
        `
      };
    }

    // Next we validate and assign the world a port to run on
    const port = this.getAvailablePort();
    if (!port) {
      return {
        success: false,
        error: `
          There are no available PORTs for this host. The administrator needs
          to adjust the settings to allow for more ports to accomodate the
          max worlds allowed, or there is a bug in the system which the admin
          needs to address.
        `
      };
    }

    world.port = port;
    world.online = 0;

    return null;
  }
}

export const InstanceManager = new InstanceManagerSingleton();
