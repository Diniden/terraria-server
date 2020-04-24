import { Express } from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { JWT_CONFIG } from './jwt.config';
import { userConfig } from './user.config';

/**
 * Configure all app paths for the server
 */
export function configureREST(app: Express) {
  app.get('/login', (req, res, next) => {
    passport.authenticate('login', (err, user, info) => {
      if (err) {
        console.error(err);
      }

      if (info !== undefined) {
        console.warn(info.message);
        res.send(info.message);
      }

      else {
        req.logIn(user, async err => {
          if (err) {
            console.error(err);
          }

          const user = await userConfig();
          const token = jwt.sign({ id: user.name }, JWT_CONFIG.secret);

          res.status(200).send({
            auth: true,
            token: token,
            message: 'Success!',
          });
        });
      }
    })(req, res, next);
  });
}
