import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import UserService from '../services/UserService.js'; // Vamos adicionar o método findOrCreateGoogleUser aqui
import dotenv from 'dotenv';

dotenv.config();

const configurePassport = () => {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Aqui, 'profile' contém as informações do usuário do Google
      // { id: '...', displayName: '...', name: { familyName: '...', givenName: '...' }, emails: [ { value: '...', verified: true } ], photos: [ { value: '...' } ], provider: 'google' }

      const email = profile.emails[0].value;
      const nome = profile.displayName; // Ou profile.name.givenName

      // Encontrar ou criar o usuário no nosso DB
      const user = await UserService.findOrCreateGoogleUser(email, nome, profile.id);
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));

  // Serialização e desserialização do usuário para sessões
  // Embora usemos JWT para a API RESTful, o Passport exige isso
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await UserService.getUserById(id); // Assumindo que você tem um método para buscar user por ID
      done(null, user);
    } catch (error) {
      done(error, false);
    }
  });
};

export default configurePassport;
