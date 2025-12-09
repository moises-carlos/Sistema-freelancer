import { Router } from 'express';
import AuthController from '../controllers/auth/AuthController.js';
import { validateUser } from '../validators/userValidator.js';
import { body } from 'express-validator';
import passport from 'passport'; // Importar passport
import authorize from '../middleware/authMiddleware.js'; // Importar nosso middleware

const router = Router();

router.post('/register', validateUser, AuthController.register);
router.post('/login', [
  body('email').isEmail(),
  body('senha').isLength({ min: 6 }),
], AuthController.login);

// Rotas de autenticação Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }), // Redireciona para /login em caso de falha
  (req, res) => {
    // Autenticação bem-sucedida, gerar nosso JWT
    // AuthController is exported as an instance, so call the static method via its constructor
    const token = AuthController.constructor.generateJwtToken(req.user);

    // Redirecionar para o frontend (evita ir para a raiz do backend que atualmente responde "Servidor funcionando!")
    // Use a variável de ambiente FRONTEND_URL quando disponível, caso contrário cai no dev padrão do Vite
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    // Redireciona para a home do frontend incluindo o token como query param (o frontend deve consumir e armazenar o token)
    res.redirect(`${frontendUrl}/?token=${token}`);
  }
);

// Rota protegida para fins de teste
router.get(
  '/protected',
  authorize(['freelancer']), // Apenas 'freelancer' pode acessar
  (req, res) => {
    res.status(200).json({ message: 'Acesso permitido', user: req.user });
  }
);

export default router;