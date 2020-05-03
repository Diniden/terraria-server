import bcrypt from 'bcrypt';
import passport from 'passport';
import passportJwt from 'passport-jwt';
import passportLocal from 'passport-local';
import { JWT_CONFIG } from './jwt.config';
import { IUser, userConfig } from './user.config';

const { Strategy: LocalStrategy} = passportLocal;
const { ExtractJwt: ExtractJWT, Strategy: JWTstrategy } = passportJwt;

let user: IUser | undefined;

async function init() {
  user = await userConfig();
}

passport.use(
  'login',
  new LocalStrategy(
    {
      usernameField: 'sig1',
      passwordField: 'sig2',
      session: false,
    },
    (userName, password, done) => {
      if (!user) {
        return done(null, false, { message: 'User is not initialized' });
      }

      try {
        if (user.name !== userName) {
          return done(null, false, { message: 'bad username' });
        } else {
          bcrypt.compare(password, user.password).then(response => {
            if (response !== true) {
              console.warn('Passwords do not match');
              return done(null, false, { message: 'passwords do not match' });
            }

            console.warn('User found & authenticated');
            // note the return needed with passport local - remove this return for passport JWT
            return done(null, user);
          });
        }
      } catch (err) {
        done(err);
      }
    },
  ),
);

const opts = {
  jwtFromRequest: ExtractJWT.fromAuthHeaderWithScheme('TKO'),
  secretOrKey: JWT_CONFIG.secret,
};

passport.use(
  'jwt',
  new JWTstrategy(opts, (jwt_payload, done) => {
    if (!user) {
      done(null, false, { message: 'User is not initialized' });
      return;
    }

    try {
      if (user.name === jwt_payload.id) {
        // console.log('user found in db in passport');
        // note the return removed with passport JWT - add this return for passport local
        done(null, user);
      } else {
        console.warn('Invalid user request');
        done(null, false);
      }
    } catch (err) {
      done(err);
    }
  }),
);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

init();
