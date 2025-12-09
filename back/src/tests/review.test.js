import request from 'supertest';
import express from 'express';
import reviewRoutes from '../routes/reviewRoutes.js';
import projectRoutes from '../routes/projectRoutes.js';
import proposalRoutes from '../routes/proposalRoutes.js';
import authRoutes from '../routes/authRoutes.js'; // Para autenticação e geração de tokens
import sql from '../config/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
// Middleware dummy para req.user (similar ao que fizemos em outros testes)
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
app.use('/api/proposals', proposalRoutes);
app.use('/api/reviews', reviewRoutes);


describe('Review Endpoints', () => {
  let empresaToken;
  let freelancerToken;
  let adminToken;
  let empresaId;
  let freelancerId;
  let adminId;
  let projectId;
  let proposalId;
  let otherEmpresaToken;
  let otherFreelancerToken;

  beforeEach(async () => {
    // A limpeza (TRUNCATE) já foi feita pelo setupTests.js
    
    // 1. Criar usuários de teste (empresa, freelancer, admin, outros)
    const saltRounds = 10;
    const empresaPassword = await bcrypt.hash('passwordEmpresa', saltRounds);
    const freelancerPassword = await bcrypt.hash('passwordFreelancer', saltRounds);
    const adminPassword = await bcrypt.hash('passwordAdmin', saltRounds);
    const otherEmpresaPassword = await bcrypt.hash('passwordOtherEmpresa', saltRounds);
    const otherFreelancerPassword = await bcrypt.hash('passwordOtherFreelancer', saltRounds);

    const [empresa] = await sql`
      INSERT INTO users (nome, email, senha, tipo)
      VALUES ('Empresa Avaliacao', 'empresa_ava@test.com', ${empresaPassword}, 'empresa')
      RETURNING id
    `;
    empresaId = empresa.id;

    const [freelancer] = await sql`
      INSERT INTO users (nome, email, senha, tipo)
      VALUES ('Freelancer Avaliacao', 'freela_ava@test.com', ${freelancerPassword}, 'freelancer')
      RETURNING id
    `;
    freelancerId = freelancer.id;

    const [admin] = await sql`
      INSERT INTO users (nome, email, senha, tipo)
      VALUES ('Admin Avaliacao', 'admin_ava@test.com', ${adminPassword}, 'admin')
      RETURNING id
    `;
    adminId = admin.id;

    const [otherEmpresa] = await sql`
      INSERT INTO users (nome, email, senha, tipo)
      VALUES ('Outra Empresa', 'outra_empresa@test.com', ${otherEmpresaPassword}, 'empresa')
      RETURNING id
    `;

    const [otherFreelancer] = await sql`
      INSERT INTO users (nome, email, senha, tipo)
      VALUES ('Outro Freelancer', 'outro_freela@test.com', ${otherFreelancerPassword}, 'freelancer')
      RETURNING id
    `;

    // 2. Gerar tokens para os testes
    empresaToken = jwt.sign({ id: empresaId, tipo: 'empresa' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    freelancerToken = jwt.sign({ id: freelancerId, tipo: 'freelancer' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    adminToken = jwt.sign({ id: adminId, tipo: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    otherEmpresaToken = jwt.sign({ id: otherEmpresa.id, tipo: 'empresa' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    otherFreelancerToken = jwt.sign({ id: otherFreelancer.id, tipo: 'freelancer' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 3. Criar um projeto base para testes
    const [project] = await sql`
      INSERT INTO projects (titulo, descricao, empresa_id)
      VALUES ('Projeto para Avaliacao', 'Projeto para testar avaliações.', ${empresaId})
      RETURNING id
    `;
    projectId = project.id;

    // 4. Criar e ACEITAR uma proposta para o projeto (crucial para a validação de avaliação)
    const proposalResponse = await request(app)
      .post('/api/proposals')
      .set('Authorization', `Bearer ${freelancerToken}`)
      .send({
        valor: 1000.00,
        descricao: 'Proposta para o projeto de avaliação.',
        project_id: projectId,
      });
    
    // Atualizar o status da proposta para 'aceita'
    await request(app)
      .patch(`/api/proposals/${proposalResponse.body.id}/status`)
      .set('Authorization', `Bearer ${empresaToken}`)
      .send({ status: 'aceita' });
    
    proposalId = proposalResponse.body.id; // Salvar para referência, embora não seja usada diretamente na criação de review
  });

  describe('POST /api/reviews', () => {
    it('deve permitir que uma empresa avalie um freelancer após proposta aceita', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({
          rating: 5,
          comment: 'Ótimo trabalho! Superou as expectativas.',
          reviewee_id: freelancerId,
          project_id: projectId,
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.reviewer_id).toBe(empresaId);
      expect(res.body.reviewee_id).toBe(freelancerId);
    });

    it('deve permitir que um freelancer avalie uma empresa após proposta aceita', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          rating: 4,
          comment: 'Empresa profissional e pagou em dia.',
          reviewee_id: empresaId,
          project_id: projectId,
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.reviewer_id).toBe(freelancerId);
      expect(res.body.reviewee_id).toBe(empresaId);
    });

    it('não deve permitir avaliar se não há proposta aceita para o projeto', async () => {
      // Criar um novo projeto e tentar avaliar sem proposta aceita
      const [newProject] = await sql`
        INSERT INTO projects (titulo, descricao, empresa_id)
        VALUES ('Projeto sem Proposta Aceita', 'Projeto para testar avaliacao sem proposta.', ${empresaId})
        RETURNING id
      `;

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({
          rating: 3,
          comment: 'Tentativa de avaliação sem proposta.',
          reviewee_id: freelancerId,
          project_id: newProject.id,
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Apenas participantes com proposta aceita');
    });

    it('não deve permitir avaliar a si mesmo', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          rating: 1,
          comment: 'Auto-avaliação.',
          reviewee_id: freelancerId,
          project_id: projectId,
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('não pode avaliar a si mesmo');
    });

    it('deve retornar erro 400 para dados de avaliação inválidos', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({
          rating: 6, // Rating inválido
          comment: 'Comentário.',
          reviewee_id: freelancerId,
          project_id: projectId,
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/reviews/reviewee/:revieweeId', () => {
    let reviewId;
    beforeEach(async () => {
      // Criar uma avaliação para o freelancer
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({
          rating: 5,
          comment: 'Ótimo trabalho! Superou as expectativas.',
          reviewee_id: freelancerId,
          project_id: projectId,
        });
      reviewId = res.body.id;
    });

    it('deve permitir que o reviewee liste suas próprias avaliações recebidas', async () => {
      const res = await request(app)
        .get(`/api/reviews/reviewee/${freelancerId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(r => r.id === reviewId)).toBe(true);
    });

    it('deve permitir que um admin liste as avaliações recebidas por qualquer usuário', async () => {
        const res = await request(app)
            .get(`/api/reviews/reviewee/${freelancerId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some(r => r.id === reviewId)).toBe(true);
    });

    it('não deve permitir que outro usuário liste avaliações de outra pessoa', async () => {
      const res = await request(app)
        .get(`/api/reviews/reviewee/${freelancerId}`)
        .set('Authorization', `Bearer ${otherEmpresaToken}`); // Outra empresa

      expect(res.statusCode).toEqual(403);
    });
  });

  describe('GET /api/reviews/reviewer/:reviewerId', () => {
    let reviewId;
    beforeEach(async () => {
      // Criar uma avaliação pela empresa
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({
          rating: 5,
          comment: 'Ótimo trabalho! Superou as expectativas.',
          reviewee_id: freelancerId,
          project_id: projectId,
        });
      reviewId = res.body.id;
    });

    it('deve permitir que o reviewer liste as avaliações que fez', async () => {
      const res = await request(app)
        .get(`/api/reviews/reviewer/${empresaId}`)
        .set('Authorization', `Bearer ${empresaToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(r => r.id === reviewId)).toBe(true);
    });

    it('deve permitir que um admin liste as avaliações feitas por qualquer usuário', async () => {
        const res = await request(app)
            .get(`/api/reviews/reviewer/${empresaId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some(r => r.id === reviewId)).toBe(true);
    });

    it('não deve permitir que outro usuário liste avaliações feitas por outra pessoa', async () => {
      const res = await request(app)
        .get(`/api/reviews/reviewer/${empresaId}`)
        .set('Authorization', `Bearer ${otherFreelancerToken}`); // Outro freelancer

      expect(res.statusCode).toEqual(403);
    });
  });

  describe('GET /api/reviews/:id', () => {
    let reviewId;
    beforeEach(async () => {
      // Criar uma avaliação para o freelancer pela empresa
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({
          rating: 5,
          comment: 'Ótimo trabalho! Superou as expectativas.',
          reviewee_id: freelancerId,
          project_id: projectId,
        });
      reviewId = res.body.id;
    });

    it('deve permitir que o reviewer visualize a avaliação', async () => {
      const res = await request(app)
        .get(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${empresaToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toBe(reviewId);
    });

    it('deve permitir que o reviewee visualize a avaliação', async () => {
      const res = await request(app)
        .get(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toBe(reviewId);
    });

    it('deve permitir que um admin visualize a avaliação', async () => {
        const res = await request(app)
            .get(`/api/reviews/${reviewId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.id).toBe(reviewId);
    });

    it('não deve permitir que outro usuário visualize a avaliação', async () => {
      const res = await request(app)
        .get(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${otherFreelancerToken}`);

      expect(res.statusCode).toEqual(403);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    let reviewId;
    beforeEach(async () => {
      // Criar uma avaliação para o freelancer pela empresa
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({
          rating: 5,
          comment: 'Ótimo trabalho! Superou as expectativas.',
          reviewee_id: freelancerId,
          project_id: projectId,
        });
      reviewId = res.body.id;
    });

    it('deve permitir que o reviewer atualize sua própria avaliação', async () => {
      const res = await request(app)
        .put(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({ rating: 3, comment: 'Trabalho aceitável.' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toBe(reviewId);
      expect(res.body.rating).toBe(3);
      expect(res.body.comment).toBe('Trabalho aceitável.');
    });

    it('não deve permitir que outro usuário atualize a avaliação', async () => {
      const res = await request(app)
        .put(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${freelancerToken}`) // Freelancer não é o reviewer
        .send({ rating: 1, comment: 'Comentário alterado.' });

      expect(res.statusCode).toEqual(404); // Serviço retorna 404 se não for encontrada/permissão
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    let reviewId;
    beforeEach(async () => {
      // Criar uma avaliação para o freelancer pela empresa
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({
          rating: 5,
          comment: 'Ótimo trabalho! Superou as expectativas.',
          reviewee_id: freelancerId,
          project_id: projectId,
        });
      reviewId = res.body.id;
    });

    it('deve permitir que o reviewer delete sua própria avaliação', async () => {
      const res = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${empresaToken}`);

      expect(res.statusCode).toEqual(204);
    });

    it('não deve permitir que outro usuário delete a avaliação', async () => {
      const res = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${freelancerToken}`); // Freelancer não é o reviewer

      expect(res.statusCode).toEqual(404); // Serviço retorna 404 se não for encontrada/permissão
    });
  });
});