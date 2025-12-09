import jwt from 'jsonwebtoken';
import sql from '../../config/database.js';
import bcrypt from 'bcrypt';
import UserService from '../UserService.js';

class AuthService {
  async registerUser(nome, email, senha, tipo) {
    const user = await UserService.createUser(nome, email, senha, tipo);
    return user;
  }

  async login(email, senha) {
    const [user] = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const passwordMatch = await bcrypt.compare(senha, user.senha);

    if (!passwordMatch) {
      throw new Error('Senha inválida');
    }

    // Retorna o objeto user, o token será gerado no AuthController
    return user;
  }
}

export default new AuthService();