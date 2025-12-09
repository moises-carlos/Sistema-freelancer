import UserService from '../../services/UserService.js';

class UserController {
  async createUser(req, res) {
    const { nome, email, senha, tipo } = req.body;

    if (!['admin', 'empresa', 'freelancer'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de usuário inválido' });
    }

    try {
      const user = await UserService.createUser(nome, email, senha, tipo);
      res.status(201).json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar usuário', message: error.message });
    }
  }
}

export default new UserController();
