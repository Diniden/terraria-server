import path from "path";
import { WORLD_CONFIG } from "../config/world.config";
import { IWorldInternal, IWorldInternalSchema } from "../types";
const fs = require("fs-extra");

/**
 * Checks if a path is a directory or a file
 */
function isDir(basePath: string) {
  return fs.lstatSync(basePath).isDirectory();
}

/**
 * This is an
 */
class WorldMetaDataStore {
  /** This is all of the current data stored and known about active and inactive worlds */
  data: IWorldInternal[] = [];

  /**
   * Triggers all of the meta data to be saved to a local file
   */
  save() {
    // Our validation of the validity of our file comes from loading the file initially
    // So we will save blindly because I'm lazy
    const filePath = WORLD_CONFIG.worldDataPath || path.resolve("world-meta-data.json");
    fs.writeJSONSync(filePath, this.data);
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
        const data = fs.readJSONSync(filePath);

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
      console.log(fs);
      fs.outputJSONSync(filePath, this.data);
    }
  }
}

export const WorldMetaData = new WorldMetaDataStore();
