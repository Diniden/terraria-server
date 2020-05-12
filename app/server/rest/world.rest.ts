import { Express } from 'express';
import passport from 'passport';
import { IWorld, IWorldSchema } from '../../types/rest/world';
import { InstanceManager } from '../terraria/instance-manager';
import { WorldMetaData } from '../terraria/world-meta-data.store';

/**
 * REST configuration for World objects
 */
export function RESTWorld(app: Express) {
  // GET / FETCH a world record
  app.get('/world', passport.authenticate('jwt', { session: true}), (req, res) => {
    // Request for ALL worlds
    res.status(200).send(
      WorldMetaData.data.map(WorldMetaData.toExternalWorld)
    );
  });

  app.get('/world/:name', passport.authenticate('jwt', { session: true}), (req, res) => {
    // If the request has a name identifier, then we send a single world's info
    if (req.params && req.params.name) {
      const world = WorldMetaData.data.find(world => world.name === req.params.name);

      if (world) {
        const out = WorldMetaData.toExternalWorld(world);
        res.status(200).send(out);
        return;
      }
    }

    // No resource found for the provided name
    res.status(404).send({
      success: false,
      error: "World not found"
    });
  });

  // POST / CREATE a new world
  app.post('/world', passport.authenticate('jwt', { session: true }), async (req, res) => {
    const newWorld: IWorld = req.body;
    const result = IWorldSchema.validate(newWorld);

    if (result.error || result.errors) {
      res.status(400).send({
        success: false,
        error: result.error
      });
      return;
    }

    const existing = WorldMetaData.data.find(world => world.name === newWorld.name);

    // If a duplicate named world is present, we just start the world with some possibly changed
    // values
    if (existing) {
      // If the server is already active, then we send an error back
      if (existing.isActive) {
        res.status(200).send({
          success: false,
          error: 'The world with this name is already running.'
        });
        return;
      }

      // You can only boot up an existing server if you know the world's password.
      if (existing.password && existing.password !== newWorld.password) {
        res.status(200).send({
          success: false,
          error: 'Incorrect password for the world specified.'
        });
        return;
      }

      // If no password is set for the world yet, but you enter a password for it, then it shall
      // be given a password
      else (!existing.password); {
        existing.password = newWorld.password || '';
      }

      // We can edit the max number of players allowed in the world.
      existing.maxPlayers = newWorld.maxPlayers;
      // Try to start the world specified
      res.status(200).send(await InstanceManager.start(existing));
    }

    // If the world name is new, then we create the new world!
    else {
      const world = WorldMetaData.toInternalWorld(req.body);
      WorldMetaData.data.push(world);
      let response = await InstanceManager.create(world);

      if (response.success) {
        response = await InstanceManager.start(world);
      }

      if (!response.success) {
        WorldMetaData.data.splice(WorldMetaData.data.indexOf(world), 1);
      }

      res.status(200).send(response);
    }

    // Make sure our meta data is saved and backed up
    WorldMetaData.save();
  });

  // DELETE a world. This only deactivates the world from the list of active worlds.
  app.delete('/world', passport.authenticate('jwt', { session: true }), async (req, res) => {
    const result = IWorldSchema.validate(req.body);

    if (result.error || result.errors) {
      res.status(400).send({
        success: false,
        error: result.error
      });
      return;
    }

    const world = WorldMetaData.data.find(world => world.name === req.body.name);

    if (world && world.isActive) {
      res.status(200).send(await InstanceManager.stop(world));
    }

    else {
      res.status(200).send({
        success: false,
        error: 'Could not match a world that is still active to have it deactivated.'
      });
    }

    // Make sure our meta data is saved and backed up
    WorldMetaData.save();
  });
}
