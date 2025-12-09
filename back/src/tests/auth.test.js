import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/authRoutes.js';
import sql from '../config/database.js'; // Importar sql para a limpeza do beforeEach
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; // Para gerar um token de 'empresa' no teste de autorização

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Hook `beforeEach` de nível superior para popular o banco de dados para todos os testes neste arquivo.
// Isso é executado DEPOIS do `TRUNCATE` do setupTests.js, garantindo um estado limpo e populado.
beforeEach(async () => {
  const saltRounds = 10;
  const freelancerPassword = await bcrypt.hash('password123', saltRounds);
  const empresaPassword = await bcrypt.hash('password456', saltRounds);
  
  await sql`
    INSERT INTO users (id, nome, email, senha, tipo)
    VALUES (1, 'Auth User Freelancer', 'auth@test.com', ${freelancerPassword}, 'freelancer')
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, email = EXCLUDED.email, senha = EXCLUDED.senha, tipo = EXCLUDED.tipo;
  `;
  // Usamos um ID fixo para facilitar a geração de token no teste
  await sql`
    INSERT INTO users (id, nome, email, senha, tipo)
    VALUES (99, 'Auth User Empresa', 'empresa@test.com', ${empresaPassword}, 'empresa')
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, email = EXCLUDED.email, senha = EXCLUDED.senha, tipo = EXCLUDED.tipo;
  `;
});


describe('Auth Endpoints', () => {
  it('deve permitir o login de um usuário existente e retornar um token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'auth@test.com',
        senha: 'password123',
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('não deve permitir o login com credenciais inválidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'auth@test.com',
        senha: 'wrongpassword',
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error', 'Senha inválida');
  });

  it('não deve permitir o login de um usuário não registrado', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@test.com',
        senha: 'password123',
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error', 'Usuário não encontrado');
  });
});

describe('Authorization Middleware', () => {
  let token;

  beforeEach(async () => {
    // Fazer login para obter um token válido de 'freelancer' para os testes
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'auth@test.com',
        senha: 'password123',
      });
    token = res.body.token;
  });

  it('deve permitir o acesso a uma rota protegida com um token válido', async () => {
    const res = await request(app)
      .get('/api/auth/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Acesso permitido');
    expect(res.body.user.tipo).toBe('freelancer');
  });

  it('deve bloquear o acesso a uma rota protegida sem um token', async () => {
    const res = await request(app)
      .get('/api/auth/protected');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error', 'Token de autenticação não fornecido ou mal formatado.');
  });

  it('deve bloquear o acesso a uma rota protegida com um token inválido', async () => {
    const res = await request(app)
      .get('/api/auth/protected')
      .set('Authorization', `Bearer invalidtoken123`);

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error', 'Token inválido.');
  });

  it('deve bloquear o acesso se o usuário não tiver a permissão (tipo) correta', async () => {
    // Gerar um token para o usuário 'empresa'
    const empresaUser = { id: 99, tipo: 'empresa' };
    const empresaToken = jwt.sign(empresaUser, process.env.JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/auth/protected') // Esta rota requer o tipo 'freelancer'
      .set('Authorization', `Bearer ${empresaToken}`);

    expect(res.statusCode).toEqual(403);
    expect(res.body).toHaveProperty('error', 'Acesso negado. Você não tem permissão para este recurso.');
  });
});