import User from './User.js';

class Empresa extends User {
  constructor(id, nome, email, senha) {
    super(id, nome, email, senha, 'empresa');
  }
}

export default Empresa;
