import request from 'supertest';
import express from 'express';
import userRoutes from '../routes/userRoutes.js';
// Não é mais necessário importar 'sql' ou 'bcrypt' diretamente nos testes individuais,
// pois o setupTests.js cuidará da gestão do banco de dados e da criação/limpeza.

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes); // Atualizado para /api/users

describe('User Endpoints', () => {
  it('deve criar um novo usuário freelancer com sucesso', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        nome: 'Test Freelancer',
        email: 'freelancer@test.com',
        senha: 'password123',
        tipo: 'freelancer',
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.nome).toBe('Test Freelancer');
    expect(res.body.email).toBe('freelancer@test.com');
    expect(res.body.tipo).toBe('freelancer');
  });

  it('deve criar um novo usuário empresa com sucesso', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        nome: 'Test Empresa',
        email: 'empresa@test.com',
        senha: 'password123',
        tipo: 'empresa',
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.nome).toBe('Test Empresa');
    expect(res.body.email).toBe('empresa@test.com');
    expect(res.body.tipo).toBe('empresa');
  });

  it('não deve criar um usuário com tipo inválido', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        nome: 'Invalid User',
        email: 'invalid@test.com',
        senha: 'password123',
        tipo: 'invalid_type',
      });

    expect(res.statusCode).toEqual(400);
  });

  it('não deve criar um usuário com email duplicado', async () => {
    // Primeiro cria um usuário
    await request(app)
      .post('/api/users')
      .send({
        nome: 'Test Duplicate',
        email: 'duplicate@test.com',
        senha: 'password123',
        tipo: 'freelancer',
      });

    // Tenta criar outro com o mesmo email
    const res = await request(app)
      .post('/api/users')
      .send({
        nome: 'Another User',
        email: 'duplicate@test.com',
        senha: 'password123',
        tipo: 'empresa',
      });

    // Espera que falhe com status 500 (erro de constraint do banco)
    expect(res.statusCode).toEqual(500);
  });
});