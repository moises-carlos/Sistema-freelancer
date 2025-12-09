import User from './User.js';

class Admin extends User {
  constructor(id, nome, email, senha) {
    super(id, nome, email, senha, 'admin');
  }
}

export default Admin;
