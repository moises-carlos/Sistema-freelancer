import request from 'supertest';
import express from 'express';
import proposalRoutes from '../routes/proposalRoutes.js';
import projectRoutes from '../routes/projectRoutes.js'; // Para criar projetos de teste
import authRoutes from '../routes/authRoutes.js'; // Para autenticação
import sql from '../config/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
// Middleware dummy para req.user (similar ao que fizemos em project.test.js)
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
app.use('/api/auth', authRoutes); // Necessário para gerar tokens de login
app.use('/api/projects', projectRoutes); // Necessário para criar projetos
app.use('/api/proposals', proposalRoutes);


describe('Proposal Endpoints', () => {
  let empresaToken;
  let freelancerToken;
  let empresaId;
  let freelancerId;
  let projectId;
  let otherEmpresaToken;
  let otherFreelancerToken;

  beforeEach(async () => {
    // A limpeza (TRUNCATE) já foi feita pelo setupTests.js
    
    // 1. Criar usuários de teste
    const saltRounds = 10;
    const empresaPassword = await bcrypt.hash('password123', saltRounds);
    const freelancerPassword = await bcrypt.hash('password456', saltRounds);
    const otherEmpresaPassword = await bcrypt.hash('password789', saltRounds);
    const otherFreelancerPassword = await bcrypt.hash('password000', saltRounds);

    const [empresa] = await sql`
      INSERT INTO users (nome, email, senha, tipo)
      VALUES ('Test Corp Proposta', 'corp_prop@test.com', ${empresaPassword}, 'empresa')
      RETURNING id
    `;
    empresaId = empresa.id;

    const [freelancer] = await sql`
      INSERT INTO users (nome, email, senha, tipo)
      VALUES ('Test Freelancer Proposta', 'freela_prop@test.com', ${freelancerPassword}, 'freelancer')
      RETURNING id
    `;
    freelancerId = freelancer.id;

    const [otherEmpresa] = await sql`
      INSERT INTO users (nome, email, senha, tipo)
      VALUES ('Other Corp Proposta', 'other_corp_prop@test.com', ${otherEmpresaPassword}, 'empresa')
      RETURNING id
    `;

    const [otherFreelancer] = await sql`
      INSERT INTO users (nome, email, senha, tipo)
      VALUES ('Other Freelancer Proposta', 'other_freela_prop@test.com', ${otherFreelancerPassword}, 'freelancer')
      RETURNING id
    `;

    // 2. Gerar tokens para os testes
    empresaToken = jwt.sign({ id: empresaId, tipo: 'empresa' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    freelancerToken = jwt.sign({ id: freelancerId, tipo: 'freelancer' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    otherEmpresaToken = jwt.sign({ id: otherEmpresa.id, tipo: 'empresa' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    otherFreelancerToken = jwt.sign({ id: otherFreelancer.id, tipo: 'freelancer' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 3. Criar um projeto base para testes
    const [project] = await sql`
      INSERT INTO projects (titulo, descricao, empresa_id)
      VALUES ('Projeto para Proposta', 'Descrição do projeto para testar propostas.', ${empresaId})
      RETURNING id
    `;
    projectId = project.id;
  });

  describe('POST /api/proposals', () => {
    it('deve permitir que um freelancer crie uma proposta', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          valor: 1000.00,
          descricao: 'Minha proposta para o projeto.',
          project_id: projectId,
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.freelancer_id).toBe(freelancerId);
      expect(res.body.project_id).toBe(projectId);
      expect(res.body.status).toBe('pendente');
    });

    it('não deve permitir que uma empresa crie uma proposta', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({
          valor: 1000.00,
          descricao: 'Proposta da empresa.',
          project_id: projectId,
        });

      expect(res.statusCode).toEqual(403); // Apenas freelancers podem criar propostas
    });

    it('deve retornar erro 400 para dados de proposta inválidos', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          valor: -100, // Valor inválido
          descricao: 'Curta.', // Descrição inválida
          project_id: projectId,
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('não deve permitir que um freelancer crie proposta para um projeto não existente', async () => {
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          valor: 500,
          descricao: 'Proposta para projeto inexistente.',
          project_id: 99999, // ID de projeto que não existe
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Projeto não encontrado.');
    });

    it('não deve permitir que um freelancer crie uma proposta duplicada para o mesmo projeto', async () => {
      // Primeira proposta
      await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          valor: 1000.00,
          descricao: 'Minha primeira proposta para o projeto.',
          project_id: projectId,
        });

      // Segunda proposta (duplicada)
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          valor: 1200.00,
          descricao: 'Minha segunda proposta para o projeto.',
          project_id: projectId,
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Você já enviou uma proposta para este projeto.');
    });
  });

  describe('GET /api/proposals/project/:projectId', () => {
    let proposalId;
    beforeEach(async () => {
      // Criar uma proposta para o projeto base
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          valor: 1000.00,
          descricao: 'Proposta para listagem por projeto.',
          project_id: projectId,
        });
      proposalId = res.body.id;
    });

    it('deve permitir que a empresa dona do projeto liste as propostas', async () => {
      const res = await request(app)
        .get(`/api/proposals/project/${projectId}`)
        .set('Authorization', `Bearer ${empresaToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(p => p.id === proposalId)).toBe(true);
    });

    it('não deve permitir que um freelancer liste todas as propostas de um projeto', async () => {
      const res = await request(app)
        .get(`/api/proposals/project/${projectId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toEqual(403);
    });

    it('não deve permitir que outra empresa liste as propostas de um projeto que não é dela', async () => {
        const res = await request(app)
            .get(`/api/proposals/project/${projectId}`)
            .set('Authorization', `Bearer ${otherEmpresaToken}`);
        expect(res.statusCode).toEqual(403);
    });
  });

  describe('GET /api/proposals/freelancer/:freelancerId', () => {
    let proposalId;
    beforeEach(async () => {
      // Criar uma proposta para o freelancer base
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          valor: 1200.00,
          descricao: 'Proposta para listagem por freelancer.',
          project_id: projectId,
        });
      proposalId = res.body.id;
    });

    it('deve permitir que um freelancer liste suas próprias propostas', async () => {
      const res = await request(app)
        .get(`/api/proposals/freelancer/${freelancerId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(p => p.id === proposalId)).toBe(true);
    });

    it('não deve permitir que outro freelancer liste propostas', async () => {
      const res = await request(app)
        .get(`/api/proposals/freelancer/${freelancerId}`)
        .set('Authorization', `Bearer ${otherFreelancerToken}`);

      expect(res.statusCode).toEqual(403);
    });

    it('não deve permitir que uma empresa liste propostas por ID de freelancer', async () => {
      const res = await request(app)
        .get(`/api/proposals/freelancer/${freelancerId}`)
        .set('Authorization', `Bearer ${empresaToken}`);

      expect(res.statusCode).toEqual(403);
    });
  });

  describe('GET /api/proposals/:id', () => {
    let proposalId;
    beforeEach(async () => {
      // Criar uma proposta para o freelancer base
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          valor: 1500.00,
          descricao: 'Proposta para obter por ID.',
          project_id: projectId,
        });
      proposalId = res.body.id;
    });

    it('deve permitir que o freelancer dono da proposta a visualize', async () => {
      const res = await request(app)
        .get(`/api/proposals/${proposalId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toBe(proposalId);
    });

    it('deve permitir que a empresa dona do projeto visualize a proposta', async () => {
      const res = await request(app)
        .get(`/api/proposals/${proposalId}`)
        .set('Authorization', `Bearer ${empresaToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toBe(proposalId);
    });

    it('não deve permitir que um usuário não autorizado visualize a proposta', async () => {
      const res = await request(app)
        .get(`/api/proposals/${proposalId}`)
        .set('Authorization', `Bearer ${otherFreelancerToken}`);

      expect(res.statusCode).toEqual(403);
    });
  });

  describe('PATCH /api/proposals/:id/status', () => {
    let proposalId;
    beforeEach(async () => {
      // Criar uma proposta pendente para testar a atualização de status
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          valor: 2000.00,
          descricao: 'Proposta para atualização de status.',
          project_id: projectId,
        });
      proposalId = res.body.id;
    });

    it('deve permitir que a empresa dona do projeto atualize o status da proposta para "aceita"', async () => {
      const res = await request(app)
        .patch(`/api/proposals/${proposalId}/status`)
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({ status: 'aceita' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('aceita');
    });

    it('deve permitir que a empresa dona do projeto atualize o status da proposta para "recusada"', async () => {
        const res = await request(app)
          .patch(`/api/proposals/${proposalId}/status`)
          .set('Authorization', `Bearer ${empresaToken}`)
          .send({ status: 'recusada' });
  
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('recusada');
    });

    it('não deve permitir que um freelancer atualize o status da proposta', async () => {
      const res = await request(app)
        .patch(`/api/proposals/${proposalId}/status`)
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({ status: 'aceita' });

      expect(res.statusCode).toEqual(403);
    });

    it('não deve permitir que a empresa atualize para um status inválido', async () => {
      const res = await request(app)
        .patch(`/api/proposals/${proposalId}/status`)
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({ status: 'status_invalido' });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('DELETE /api/proposals/:id', () => {
    let proposalIdToDelete;
    beforeEach(async () => {
      // Criar uma proposta para ser deletada
      const res = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          valor: 500.00,
          descricao: 'Proposta para deletar.',
          project_id: projectId,
        });
      proposalIdToDelete = res.body.id;
    });

    it('deve permitir que o freelancer dono da proposta a delete se estiver pendente', async () => {
      const res = await request(app)
        .delete(`/api/proposals/${proposalIdToDelete}`)
        .set('Authorization', `Bearer ${freelancerToken}`);

      expect(res.statusCode).toEqual(204);
    });

    it('não deve permitir que o freelancer delete a proposta se não for pendente', async () => {
        // Primeiro aceitar a proposta
        await request(app)
            .patch(`/api/proposals/${proposalIdToDelete}/status`)
            .set('Authorization', `Bearer ${empresaToken}`)
            .send({ status: 'aceita' });

        const res = await request(app)
            .delete(`/api/proposals/${proposalIdToDelete}`)
            .set('Authorization', `Bearer ${freelancerToken}`);

        expect(res.statusCode).toEqual(404); // Serviço retorna 404 se não for encontrada/permisssão
    });

    it('não deve permitir que uma empresa delete uma proposta', async () => {
      const res = await request(app)
        .delete(`/api/proposals/${proposalIdToDelete}`)
        .set('Authorization', `Bearer ${empresaToken}`);

      expect(res.statusCode).toEqual(403);
    });
  });
});