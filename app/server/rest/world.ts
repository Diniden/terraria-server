import { Express } from 'express';
import passport from 'passport';
import { IWorldSchema } from '../../types/rest/world';

const worlds = [{
  name: "Test World",
  online: 5,
  maxPlayers: 8,
  difficulty: "Crazy Stupid Hard"
}];

/**
 * REST configuration for World objects
 */
export function RESTWorld(app: Express) {
  // GET / FETCH a world record
  app.get('/world/:name', passport.authenticate('jwt', { session: true}), (req, res) => {
    if (req.params && req.params.name) {
      const world = worlds.find(world => world.name === req.params.name);

      if (world) {
        res.status(200).send(world);
        return;
      }

      res.status(404).send({});
      return;
    }

    res.status(200).send({
      worlds
    });
  });

  // POST / CREATE a new world
  app.post('/world', passport.authenticate('jwt', { session: true }), (req, res) => {
    const result = IWorldSchema.validate(req.body);

    if (result.error) {
      res.status(400).send({});
      return;
    }

    // If a duplicate named world is present, we disallow
    if (worlds.find(world => world.name === req.body.name)) {
      res.status(200).send({ success: false });
      return;
    }

    worlds.push(req.body);

    res.status(200).send({ success: true });
  });

  // DELETE a world
  app.delete('/world', passport.authenticate('jwt', { session: true }), (req, res) => {
    const result = IWorldSchema.validate(req.body);

    if (result.error) {
      res.status(400).send({});
      return;
    }

    const world = worlds.find(world => world.name === req.body.name);

    if (world) {
      worlds.splice(worlds.indexOf(world), 1);
      res.status(200).send({ success: true });
      return;
    }

    res.status(200).send({ success: false });
  });

  // PUT / UPDATE a world
  app.put('/world/:name', passport.authenticate('jwt', { session: true }), (req, res) => {
    const result = IWorldSchema.validate(req.body);

    if (result.error) {
      res.status(400).send({ success: false });
      return;
    }

    if (req.params && req.params.name) {
      const world = worlds.find(world => world.name === req.params.name);

      Object.assign(world, req.body);

      if (world) {
        res.status(200).send(world);
        return;
      }

      res.status(404).send({ success: false });
      return;
    }

    res.status(400).send({ success: false });
  });
}
