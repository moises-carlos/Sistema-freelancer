import sql from '../config/database.js';
import bcrypt from 'bcrypt';

class UserService {
  async createUser(nome, email, senha, tipo) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(senha, saltRounds);

    const [user] = await sql`
      INSERT INTO users (nome, email, senha, tipo)
      VALUES (${nome}, ${email}, ${hashedPassword}, ${tipo})
      RETURNING id, nome, email, tipo
    `;

    return user;
  }

  async getUserByEmail(email) {
    const [user] = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    return user;
  }

  async getUserById(id) {
    const [user] = await sql`
      SELECT id, nome, email, tipo FROM users WHERE id = ${id}
    `;
    return user;
  }

  async findOrCreateGoogleUser(email, nome, googleId) {
    let user = await this.getUserByEmail(email);

    if (user) {
      // Se o usuário existe, mas não tem googleId, podemos associar
      // Por simplicidade, vamos apenas retornar o usuário existente.
      // Em um sistema real, você poderia atualizar para associar a conta Google.
      return user;
    }

    // Se o usuário não existe, crie um novo.
    // Usamos uma senha placeholder, pois a autenticação é via Google.
    // O tipo padrão pode ser 'freelancer' ou outro, dependendo da lógica de negócio.
    const tempPassword = googleId; // Ou uma string aleatória
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

    const [newUser] = await sql`
      INSERT INTO users (nome, email, senha, tipo)
      VALUES (${nome}, ${email}, ${hashedPassword}, 'freelancer')
      RETURNING id, nome, email, tipo
    `;
    return newUser;
  }
}

export default new UserService();