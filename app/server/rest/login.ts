import { Express } from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { JWT_CONFIG } from '../config/jwt.config';
import { userConfig } from '../config/user.config';

export function RESTLogin(app: Express) {
  app.post('/login', (req, res, next) => {
    passport.authenticate('login', (err, user, info) => {
      if (err) {
        console.error(err);
      }

      if (info !== undefined) {
        console.warn(info.message);
        res.send({
          session: {
            auth: false,
            message: 'Login is not valid',
            info
          }
        });
      }

      else {
        req.logIn(user, async err => {
          if (err) {
            console.error(err);
          }

          const user = await userConfig();
          const token = jwt.sign({ id: user.name }, JWT_CONFIG.secret);

          res.status(200).send({
            user: {
              name: user.name
            },
            session: {
              auth: true,
              token,
              info,
              message: 'Success!',
            }
          });
        });
      }
    })(req, res, next);
  });
}
