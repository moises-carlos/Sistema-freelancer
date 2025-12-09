import User from './User.js';

class Freelancer extends User {
  constructor(id, nome, email, senha) {
    super(id, nome, email, senha, 'freelancer');
  }
}

export default Freelancer;
