import publicIp from "public-ip";
import { IWorld } from "../../types/rest/world";
import { WORLD_CONFIG } from "../config/world.config";
import { IWorldInternal } from "../types";
import { findExecutable } from "./find-executable";
import { ITerrariaServerProcess, TerrariaServerProcess } from "./terraria-server-process";
import { WorldMetaData } from "./world-meta-data.store";

/**
 * This is the manager that creates new world instances and monitors
 */
export class InstanceManagerSingleton {
  private initializing?: Promise<void>;
  private initialized: boolean = false;
  private autoSaveInterval: NodeJS.Timer;

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

    // Locate our executables
    const exe = findExecutable();

    // Set our pathing properly for our single process executables
    TerrariaServerProcess.serverStartScriptPath = exe.serverStartScriptPath;
    TerrariaServerProcess.serverExecutables = exe.serverExecutables;

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
    }

    // Start the auto saving procedure
    this.initAutoSave();

    delete this.initializing;
    this.initialized = true;
  }

  /**
   * Starts up a process that will automatically
   */
  initAutoSave() {
    if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);

    // Auto save every 30 minutes
    this.autoSaveInterval = setInterval(() => {
      this.runningProcesses.forEach(server => {
        server.save();
      });
    }, 30 * 60 * 1000);
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

        if (onFinish) onFinish();
        else {
          names.forEach((name, i) => {
            console.warn('SYNC LOAD ID', name, i);
            WorldMetaData.syncId(name, i);
          });
        }
      }

      return false;
    };
  }

  /**
   * Parses server data for indication that the server has started and is ready to accept users.
   */
  private createServerStartedParser(world: IWorldInternal, timeoutId: { timer: number }, resolve?: Function) {
    let complete = false;

    return (data: string, server: TerrariaServerProcess) => {
      if (!complete && data.indexOf("Type 'help' for a list of commands.") >= 0) {
        clearTimeout(timeoutId.timer);
        world.isActive = true;
        console.warn('The world', world.name, 'has successfully started');
        resolve?.();
        complete = true;
        server.startedSuccessfully();
      }

      return complete;
    };
  }

  /**
   * Parses server data for indication of users joining and leaving
   */
  private createOnlinePlayerParser(world: IWorldInternal) {
    return (data: string, server: TerrariaServerProcess) => {
      if (data.indexOf("has joined") >= 0) {
        world.online++;
      }

      // When a user leaves, we should save the server state so the user can at least
      // expect his latest work to be preserved.
      if (data.indexOf("has left") >= 0) {
        world.online--;
        server.save();
      }

      // This process never completes
      return false;
    };
  }

  /**
   * This creates a timer reloader that reloads a timeout time every time a new
   * piece of data streams in. This lets you create a timeout that only times out if the
   * server process is not outputting any additional information.
   */
  private createTimerReloadParser(callback: Function, timeout: number, timeoutId: { timer: number }) {
    timeoutId.timer = setTimeout(callback, timeout);

    return (data: string) => {
      if (data) {
        clearTimeout(timeoutId.timer);
        timeoutId.timer = setTimeout(callback, timeout);
      }
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
    console.warn('Killing process for world', process.name);
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
    const timeoutId = { timer: -1 };
    const timer = this.createTimerReloadParser(async () => {
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

      resolve?.();
    }, WORLD_CONFIG.worldStartTimeout, timeoutId);

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

    // Start up the server and answer all of the initialization questions
    const server = this.newServerProcess({
      world,
      inputs: [
        ['Choose World:', `n\n`],
        ['Choose size:', `${sizePick[world.size]}\n`],
        ['Choose difficulty:', `${difficultyPick[world.difficulty]}\n`],
        ['Enter world name:', `${world.name}\n`],

        // The second time we see the choose world option, we should stop this process
        // as the world has been successfully created
        ['Choose World:', () => {
          clearTimeout(timeoutId.timer);
          this.stopServerProcess(server).then(() => {
            resolve?.();
          });
          return '';
        }],
      ],

      onData: (line: string) => {
        if (syncIds(line)) {
          syncIds(line);
        }
        timer(line);
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
    let success = true;
    let error;

    // Start up a timeout to stop the start up process if it's taking too long. This is
    // currently our only form of error handling for the situation.
    const timeoutId = { timer: -1 };
    const timer = this.createTimerReloadParser(async () => {
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

      resolve?.();
    }, WORLD_CONFIG.worldStartTimeout, timeoutId);

    // Make our sync id process to use while processing our new server
    const syncIds = this.createSyncIdParser();
    const serverStart = this.createServerStartedParser(world, timeoutId, resolve);
    const playerConnection = this.createOnlinePlayerParser(world);

    // Start up the server and answer all of the initialization questions
    const server = this.newServerProcess({
      world,
      inputs: [
        ['Choose World:', () => `${world.loadId}\n`],
        ['Max players (press enter for 8):', `${world.maxPlayers}\n`],
        ['Server port (press enter for 7777):', `${world.port}\n`],
        ['Automatically forward port? (y/n):', `n\n`],
        ['Server password (press enter for none):', `${world.password}\n`],
      ],

      onData: (line: string) => {
        syncIds(line);

        if (serverStart(line, server)) {
          playerConnection(line, server);
        }

        else {
          timer(line);
        }
      },

      onExit: () => {
        this.stopServerProcess(server);
      }
    });

    await p;
    WorldMetaData.save();

    if (success) {
      world.connection = `IP: ${await publicIp.v4()} Port: ${world.port}`;
    }

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
    console.warn("Shutting down world", process.name);
    await this.stopServerProcess(process);
    world.isActive = false;

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
