import fs from "fs-extra";
import path from "path";
import { WORLD_CONFIG } from "../config/world.config";
import { IWorldInternal, IWorldInternalSchema } from "../types";

/**
 * Checks if a path is a directory or a file
 */
function isDir(basePath: string) {
  return fs.lstatSync(basePath).isDirectory();
}

/**
 * This is the store that monitors our meta data. It has actions necessary to sync the
 * data to the file system and load the state from it.
 */
class WorldMetaDataStore {
  /** This is all of the current data stored and known about active and inactive worlds */
  data: IWorldInternal[] = [];

  /**
   * After running our server once to retrieve the available worlds to work with, we sync up
   * to ensure our meta data lists only the worlds that truly do exist (by name). If the name
   * was not listed, then the world gets removed from our meta data list. If the world
   * exists, but no meta data is created, then we populate some default data for that world.
   *
   * This returns a list of meta data objects that needs to have a process executed to do
   * a full deep sync.
   */
  sync(existingWorlds: string[]) {
    const toRemove: (IWorldInternal | undefined)[] = [];

    // First find which actual worlds exists but do not have meta data
    existingWorlds.forEach((worldName, i) => {
      const found = this.data.find(world => world.name === worldName);

      // If meta data is found, we update that meta data with the proper identifier required
      // to start the world when the prompt lists the worlds.
      if (found) {
        found.loadId = i + 1;
      }

      // If no meta data is found, we should generate some default meta data for that world
      else {
        this.data.push({
          name: worldName,
          difficulty: 'Unknown',
          isActive: false,
          loadId: i,
          maxPlayers: 8,
          online: 0,
          port: 7777,
          size: "Unknown",
          password: "",
        });
      }
    });

    // If meta data exists, but no world exists for that meta data, then we prune that meta data
    // out of our list.
    this.data.forEach(world => {
      const found = existingWorlds.find(name => (world.name === name));
      if (!found) toRemove.push(world);
    });

    // Perform the remove operation
    toRemove.filter(Boolean).forEach(world => {
      if (!world) return;
      this.data.splice(this.data.indexOf(world), 1);
      console.warn("DELETED META DATA FOR WORLD:", world.name);
    });
  }

  /**
   * Looks for a world that macthes by name and provides that world with it's load identifier
   */
  syncId(name: string, id: number) {

  }

  /**
   * Triggers all of the meta data to be saved to a local file
   */
  save() {
    // Our validation of the validity of our file comes from loading the file initially
    // So we will save blindly because I'm lazy
    const filePath = WORLD_CONFIG.worldDataPath || path.resolve("world-meta-data.json");
    console.warn('Saving world meta data...');

    try {
      fs.writeFileSync(
        filePath,
        JSON.stringify(this.data, null, 2),
        { encoding: 'utf8' }
      );
      console.warn('World Meta Data saved!');
    }

    catch (err) {
      console.warn('Could not save world meta data.');
      console.warn(err.stack | err.message);
    }
  }

  /**
   * Loads all of the meta data from a local file to define the current worlds available to the server.
   */
  load() {
    let failed = false;
    const filePath = WORLD_CONFIG.worldDataPath || path.resolve("world-meta-data.json");

    if (fs.existsSync(filePath)) {
      // If the target file is a directory, we assume this is just invalid and quit the server application
      if (isDir(filePath)) {
        console.warn(`
          The target file for the world meta data is a directory.
          A valid FILE path must be specified for this server to run.
        `);
        process.exit(1);
      }

      // Attempt to read the contents of the file
      try {
        const data = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8' }));

        if (!Array.isArray(data)) {
          console.warn(`
            The data in the provided file does not match the expected format.
            Please confirm and correct the meta data file contents before trying
            again.
          `);
          console.warn('Meta Data Contents:', data);
          process.exit(1);
        }

        data.forEach(world => {
          const result = IWorldInternalSchema.validate(world);

          if (result.error) {
            console.warn(`
              The data in the provided file does not match the expected format.
              Please confirm and correct the meta data file contents before trying
              again.
            `);
            console.warn('Meta Data Contents:', data);
            console.warn("JOI Error:", result.error);
            console.warn("JOI Errors:", result.errors);
            process.exit(1);
          }
        });

        this.data = data;
      }

      // If there is an error reading the file, we error and quit
      catch (err) {
        console.warn(`
          Attempted to read the server meta data file, but it failed with the
          following error:
        `);
        console.warn(err.stack || err.message);
      }
    }

    else {
      failed = true;
    }

    if (failed) {
      console.warn("No file found for world meta data at:", filePath);
      console.warn("The server will execute as though no worlds have been made yet");
      console.warn("and will generate a new world meta data file at the given location.");
      console.log(filePath);
      fs.outputJSONSync(filePath, this.data);
    }
  }
}

export const WorldMetaData = new WorldMetaDataStore();
