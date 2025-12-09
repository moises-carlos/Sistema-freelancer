import request from 'supertest';
import express from 'express';
import contractRoutes from '../routes/contractRoutes.js';
import projectRoutes from '../routes/projectRoutes.js';
import proposalRoutes from '../routes/proposalRoutes.js';
import authRoutes from '../routes/authRoutes.js';
import sql from '../config/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
// Middleware dummy para req.user
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
app.use('/api/contracts', contractRoutes);


describe('Contract Endpoints', () => {
  let empresaToken;
  let freelancerToken;
  let adminToken;
  let empresaId;
  let freelancerId;
  let adminId;
  let projectId;
  let projectIdSemPropostaAceita;

  beforeEach(async () => {
    // 1. Criar usuários
    const saltRounds = 10;
    const empresaPassword = await bcrypt.hash('passwordEmpresa', saltRounds);
    const freelancerPassword = await bcrypt.hash('passwordFreelancer', saltRounds);
    const adminPassword = await bcrypt.hash('passwordAdmin', saltRounds);

    const [empresa] = await sql`INSERT INTO users (nome, email, senha, tipo) VALUES ('Empresa Contrato', 'empresa_cont@test.com', ${empresaPassword}, 'empresa') RETURNING id`;
    empresaId = empresa.id;

    const [freelancer] = await sql`INSERT INTO users (nome, email, senha, tipo) VALUES ('Freelancer Contrato', 'freela_cont@test.com', ${freelancerPassword}, 'freelancer') RETURNING id`;
    freelancerId = freelancer.id;

    const [admin] = await sql`INSERT INTO users (nome, email, senha, tipo) VALUES ('Admin Contrato', 'admin_cont@test.com', ${adminPassword}, 'admin') RETURNING id`;
    adminId = admin.id;

    // 2. Gerar tokens
    empresaToken = jwt.sign({ id: empresaId, tipo: 'empresa' }, process.env.JWT_SECRET);
    freelancerToken = jwt.sign({ id: freelancerId, tipo: 'freelancer' }, process.env.JWT_SECRET);
    adminToken = jwt.sign({ id: adminId, tipo: 'admin' }, process.env.JWT_SECRET);

    // 3. Criar projeto e proposta aceita
    const [project] = await sql`INSERT INTO projects (titulo, descricao, empresa_id) VALUES ('Projeto para Contrato', 'Descrição', ${empresaId}) RETURNING id`;
    projectId = project.id;
    
    await sql`INSERT INTO proposals (valor, descricao, freelancer_id, project_id, status) VALUES (1500, 'Proposta para contrato', ${freelancerId}, ${projectId}, 'aceita') RETURNING id`;

    // 4. Criar projeto sem proposta aceita
    const [project2] = await sql`INSERT INTO projects (titulo, descricao, empresa_id) VALUES ('Projeto Sem Contrato', 'Descrição', ${empresaId}) RETURNING id`;
    projectIdSemPropostaAceita = project2.id;
  });

  describe('POST /api/contracts', () => {
    it('deve permitir que uma empresa crie um contrato para um projeto com proposta aceita', async () => {
      const res = await request(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({
          project_id: projectId,
          terms: 'Termos do contrato simulado.'
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.project_id).toBe(projectId);
      expect(res.body.empresa_id).toBe(empresaId);
      expect(res.body.freelancer_id).toBe(freelancerId);
      expect(res.body.valor).toBe('1500.00'); // DECIMAL é retornado como string
    });

    it('não deve permitir criar contrato para projeto sem proposta aceita', async () => {
        const res = await request(app)
          .post('/api/contracts')
          .set('Authorization', `Bearer ${empresaToken}`)
          .send({
            project_id: projectIdSemPropostaAceita,
            terms: 'Termos do contrato simulado.'
          });
        
        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toContain('Não há proposta aceita para este projeto');
    });

    it('não deve permitir que um freelancer crie um contrato', async () => {
        const res = await request(app)
            .post('/api/contracts')
            .set('Authorization', `Bearer ${freelancerToken}`)
            .send({
              project_id: projectId,
              terms: 'Termos do contrato simulado.'
            });
        
        expect(res.statusCode).toEqual(403);
    });

    it('não deve permitir criar um contrato duplicado para o mesmo projeto', async () => {
        // Primeiro contrato
        await request(app)
            .post('/api/contracts')
            .set('Authorization', `Bearer ${empresaToken}`)
            .send({
                project_id: projectId,
                terms: 'Termos do contrato simulado.'
            });

        // Tentar criar de novo
        const res = await request(app)
            .post('/api/contracts')
            .set('Authorization', `Bearer ${empresaToken}`)
            .send({
                project_id: projectId,
                terms: 'Novos termos.'
            });
        
        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toContain('Já existe um contrato para este projeto');
    });
  });

  describe('GET /api/contracts', () => {
    let contractId;
    beforeEach(async () => {
        const res = await request(app)
            .post('/api/contracts')
            .set('Authorization', `Bearer ${empresaToken}`)
            .send({ project_id: projectId, terms: 'Termos para GET' });
        contractId = res.body.id;
    });

    it('deve permitir que o freelancer liste seus contratos via /my', async () => {
        const res = await request(app)
            .get('/api/contracts/my')
            .set('Authorization', `Bearer ${freelancerToken}`);

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0].id).toBe(contractId);
    });

    it('deve permitir que a empresa liste seus contratos via /my', async () => {
        const res = await request(app)
            .get('/api/contracts/my')
            .set('Authorization', `Bearer ${empresaToken}`);

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0].id).toBe(contractId);
    });

    it('deve permitir que o freelancer (participante) visualize o contrato por ID', async () => {
        const res = await request(app)
            .get(`/api/contracts/${contractId}`)
            .set('Authorization', `Bearer ${freelancerToken}`);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.id).toBe(contractId);
    });
    
    it('deve permitir que a empresa (participante) visualize o contrato por ID', async () => {
        const res = await request(app)
            .get(`/api/contracts/${contractId}`)
            .set('Authorization', `Bearer ${empresaToken}`);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.id).toBe(contractId);
    });

    it('deve permitir que o admin visualize o contrato por ID', async () => {
        const res = await request(app)
            .get(`/api/contracts/${contractId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.id).toBe(contractId);
    });
  });

  describe('PATCH /api/contracts/:id/status', () => {
    let contractId;
    beforeEach(async () => {
        const res = await request(app)
            .post('/api/contracts')
            .set('Authorization', `Bearer ${empresaToken}`)
            .send({ project_id: projectId, terms: 'Termos para PATCH' });
        contractId = res.body.id;
    });

    it('deve permitir que a empresa dona do contrato altere seu status', async () => {
        const res = await request(app)
            .patch(`/api/contracts/${contractId}/status`)
            .set('Authorization', `Bearer ${empresaToken}`)
            .send({ status: 'finalizado' });
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('finalizado');
    });

    it('deve permitir que um admin altere o status do contrato', async () => {
        const res = await request(app)
            .patch(`/api/contracts/${contractId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'quebrado' });
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('quebrado');
    });

    it('não deve permitir que um freelancer altere o status do contrato', async () => {
        const res = await request(app)
            .patch(`/api/contracts/${contractId}/status`)
            .set('Authorization', `Bearer ${freelancerToken}`)
            .send({ status: 'finalizado' });
        
        expect(res.statusCode).toEqual(403);
    });
  });

  describe('DELETE /api/contracts/:id', () => {
    let contractId;
    beforeEach(async () => {
        const res = await request(app)
            .post('/api/contracts')
            .set('Authorization', `Bearer ${empresaToken}`)
            .send({ project_id: projectId, terms: 'Termos para DELETE' });
        contractId = res.body.id;
    });

    it('deve permitir que um admin delete um contrato', async () => {
        const res = await request(app)
            .delete(`/api/contracts/${contractId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toEqual(204);
    });

    it('não deve permitir que a empresa delete um contrato', async () => {
        const res = await request(app)
            .delete(`/api/contracts/${contractId}`)
            .set('Authorization', `Bearer ${empresaToken}`);
        
        expect(res.statusCode).toEqual(403);
    });

    it('não deve permitir que o freelancer delete um contrato', async () => {
        const res = await request(app)
            .delete(`/api/contracts/${contractId}`)
            .set('Authorization', `Bearer ${freelancerToken}`);
        
        expect(res.statusCode).toEqual(403);
    });
  });
});