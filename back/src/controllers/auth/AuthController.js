import AuthService from '../../services/auth/AuthService.js';
import { validationResult } from 'express-validator';
import { validateUser } from '../../validators/userValidator.js'; // Reutilizar o validador de usuário para o registro
import jwt from 'jsonwebtoken'; // Importar jwt

class AuthController {
  // Novo método para gerar o token JWT
  static generateJwtToken(user) {
    const token = jwt.sign(
      { id: user.id, tipo: user.tipo },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return token;
  }

  async register(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, email, senha, tipo } = req.body;

    try {
      const user = await AuthService.registerUser(nome, email, senha, tipo); // Usar AuthService para registrar
      // Após o registro, já logar e retornar o token
      const token = AuthController.generateJwtToken(user);
      res.status(201).json({ user, token }); // Retorna o usuário e o token
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
  }

  async login(req, res) {
    const { email, senha } = req.body;

    try {
      const user = await AuthService.login(email, senha); // AuthService agora retorna o user, não o token
      const token = AuthController.generateJwtToken(user); // Gera o token aqui
      res.status(200).json({ token });
    } catch (error) {
      console.error(error);
      if (error.message === 'Usuário não encontrado' || error.message === 'Senha inválida') {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  }
}

export default new AuthController();