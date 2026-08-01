const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const env = require('./env');
const authService = require('../services/auth.service');

// Passport's strategy pattern in action: this file only configures HOW
// to authenticate via Google. It knows nothing about JWTs — that's handled
// separately once we know who the user is (see auth.controller.js).
passport.use(
  new GoogleStrategy(
    {
      clientID: env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL: env.google.callbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await authService.findOrCreateGoogleUser({
          googleId: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value,
        });
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// We don't use Passport sessions (we're stateless via JWT), but Passport
// requires these to be defined when using strategies with `session: false`
// is not fully bypassed internally in some versions — kept minimal/no-op safe.
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, { id }));

module.exports = passport;
