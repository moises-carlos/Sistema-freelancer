import request from 'supertest';
import express from 'express';
import projectRoutes from '../routes/projectRoutes.js';
import sql from '../config/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Precisamos montar uma 'app' de teste que use não apenas as rotas de projeto,
// mas também as rotas de autenticação para obter tokens.
import authRoutes from '../routes/authRoutes.js';
import authorize from '../middleware/authMiddleware.js'; // Importar para que as rotas funcionem

const app = express();
app.use(express.json());
// Adicionar um middleware de usuário dummy para simular o req.user que o authorize colocaria
// Isso é necessário porque não estamos testando a autenticação aqui, mas as rotas de projeto
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      // Ignorar token inválido em testes, o middleware 'authorize' vai pegar
    }
  }
  next();
});
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);


describe('Project Endpoints', () => {
  let empresaToken;
  let freelancerToken;
  let empresaId;
  let projectId;

  // beforeEach garante um estado limpo e populado para CADA teste
  beforeEach(async () => {
    // A limpeza (TRUNCATE) já foi feita pelo setupTests.js
    
    // 1. Criar usuários de teste
    const saltRounds = 10;
    const empresaPassword = await bcrypt.hash('password123', saltRounds);
    const freelancerPassword = await bcrypt.hash('password456', saltRounds);

    const [empresa] = await sql`
      INSERT INTO users (nome, email, senha, tipo)
      VALUES ('Test Corp', 'corp@test.com', ${empresaPassword}, 'empresa')
      RETURNING id
    `;
    empresaId = empresa.id;

    const [freelancer] = await sql`
      INSERT INTO users (nome, email, senha, tipo)
      VALUES ('Test Freelancer', 'freela@test.com', ${freelancerPassword}, 'freelancer')
      RETURNING id
    `;

    // 2. Gerar tokens para os testes
    empresaToken = jwt.sign({ id: empresaId, tipo: 'empresa' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    freelancerToken = jwt.sign({ id: freelancer.id, tipo: 'freelancer' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 3. Criar um projeto base para testes de GET, PUT, DELETE
    const [project] = await sql`
      INSERT INTO projects (titulo, descricao, empresa_id)
      VALUES ('Projeto Base de Teste', 'Descrição do projeto base para os testes', ${empresaId})
      RETURNING id
    `;
    projectId = project.id;
  });

  describe('POST /api/projects', () => {
    it('deve permitir que uma empresa crie um novo projeto', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({
          titulo: 'Novo Projeto de Teste',
          descricao: 'Esta é uma descrição detalhada para o novo projeto de teste.',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.titulo).toBe('Novo Projeto de Teste');
      expect(res.body.empresa_id).toBe(empresaId);
    });

    it('deve bloquear um freelancer de criar um novo projeto', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          titulo: 'Projeto do Freelancer',
          descricao: 'Este projeto não deveria ser criado.',
        });

      expect(res.statusCode).toEqual(403);
    });

    it('deve retornar erro 400 para dados de projeto inválidos', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({
          titulo: '', // Título inválido
          descricao: 'Descrição curta.', // Descrição inválida
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/projects', () => {
    it('deve permitir que um usuário autenticado liste os projetos', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${freelancerToken}`); // Pode ser qualquer token válido

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });

    it('deve retornar um projeto específico por ID', async () => {
        const res = await request(app)
            .get(`/api/projects/${projectId}`)
            .set('Authorization', `Bearer ${empresaToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.id).toBe(projectId);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('deve permitir que a empresa dona do projeto o atualize', async () => {
        const res = await request(app)
            .put(`/api/projects/${projectId}`)
            .set('Authorization', `Bearer ${empresaToken}`)
            .send({
                titulo: 'Projeto de Teste Atualizado',
                status: 'em andamento'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.titulo).toBe('Projeto de Teste Atualizado');
        expect(res.body.status).toBe('em andamento');
    });

    it('não deve permitir que outra pessoa atualize o projeto', async () => {
        const res = await request(app)
            .put(`/api/projects/${projectId}`)
            .set('Authorization', `Bearer ${freelancerToken}`)
            .send({ titulo: 'Tentativa de Update' });
        
        expect(res.statusCode).toEqual(403); // Middleware de autorização para 'empresa'
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('deve permitir que a empresa dona do projeto o delete', async () => {
        const res = await request(app)
            .delete(`/api/projects/${projectId}`)
            .set('Authorization', `Bearer ${empresaToken}`);

        expect(res.statusCode).toEqual(204);
    });

    it('não deve permitir que outra pessoa delete o projeto', async () => {
        const res = await request(app)
            .delete(`/api/projects/${projectId}`)
            .set('Authorization', `Bearer ${freelancerToken}`);

        expect(res.statusCode).toEqual(403);
    });
  });
});