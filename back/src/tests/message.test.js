import request from 'supertest';
import express from 'express';
import messageRoutes from '../routes/messageRoutes.js';
import projectRoutes from '../routes/projectRoutes.js';
import proposalRoutes from '../routes/proposalRoutes.js';
import authRoutes from '../routes/authRoutes.js';
import sql from '../config/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

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
app.use('/api/messages', messageRoutes);

describe('Message Endpoints', () => {
  let empresaToken;
  let freelancerToken;
  let otherUserToken;
  let empresaId;
  let freelancerId;
  let projectId;

  beforeEach(async () => {
    // Limpeza já feita pelo setupTests.js
    
    // 1. Criar usuários
    const saltRounds = 10;
    const empresaPassword = await bcrypt.hash('passwordEmpresa', saltRounds);
    const freelancerPassword = await bcrypt.hash('passwordFreelancer', saltRounds);
    const otherUserPassword = await bcrypt.hash('passwordOther', saltRounds);

    const [empresa] = await sql`INSERT INTO users (nome, email, senha, tipo) VALUES ('Empresa Mensagem', 'empresa_msg@test.com', ${empresaPassword}, 'empresa') RETURNING id`;
    empresaId = empresa.id;

    const [freelancer] = await sql`INSERT INTO users (nome, email, senha, tipo) VALUES ('Freelancer Mensagem', 'freela_msg@test.com', ${freelancerPassword}, 'freelancer') RETURNING id`;
    freelancerId = freelancer.id;

    const [otherUser] = await sql`INSERT INTO users (nome, email, senha, tipo) VALUES ('Outro User', 'outro_msg@test.com', ${otherUserPassword}, 'freelancer') RETURNING id`;

    // 2. Gerar tokens
    empresaToken = jwt.sign({ id: empresaId, tipo: 'empresa' }, process.env.JWT_SECRET);
    freelancerToken = jwt.sign({ id: freelancerId, tipo: 'freelancer' }, process.env.JWT_SECRET);
    otherUserToken = jwt.sign({ id: otherUser.id, tipo: 'freelancer' }, process.env.JWT_SECRET);

    // 3. Criar projeto e proposta aceita
    const [project] = await sql`INSERT INTO projects (titulo, descricao, empresa_id) VALUES ('Projeto para Mensagens', 'Descrição', ${empresaId}) RETURNING id`;
    projectId = project.id;

    const [proposal] = await sql`INSERT INTO proposals (valor, descricao, freelancer_id, project_id, status) VALUES (100, 'Proposta para msg', ${freelancerId}, ${projectId}, 'aceita') RETURNING id`;
  });

  describe('POST /api/messages', () => {
    it('deve permitir que um participante (empresa) envie uma mensagem de texto', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${empresaToken}`)
        .send({
          content: 'Olá freelancer, vamos começar o projeto.',
          project_id: projectId,
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.content).toBe('Olá freelancer, vamos começar o projeto.');
      expect(res.body.attachments).toEqual([]);
    });

    it('deve permitir que um participante (freelancer) envie uma mensagem com anexo', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .field('content', 'Segue o primeiro rascunho.')
        .field('project_id', projectId)
        .attach('attachments', Buffer.from('test file content'), 'test-file.txt');
        
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.attachments.length).toBe(1);
      expect(res.body.attachments[0].file_name).toBe('test-file.txt');
      
      // Limpeza do arquivo criado
      await fs.unlink(res.body.attachments[0].file_path);
    });

    it('deve bloquear um não-participante de enviar uma mensagem', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          content: 'Tentando enviar mensagem.',
          project_id: projectId,
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Você não é participante deste projeto');
    });

    it('deve retornar erro 400 se a mensagem não tiver conteúdo ou anexo', async () => {
        const res = await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${empresaToken}`)
          .send({
            project_id: projectId,
          });
  
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('errors');
      });
  });

  describe('GET /api/messages/project/:projectId', () => {
    beforeEach(async () => {
      // Enviar uma mensagem para o projeto
      await sql`INSERT INTO messages (content, sender_id, project_id) VALUES ('Mensagem de teste para GET', ${freelancerId}, ${projectId})`;
    });

    it('deve permitir que um participante liste as mensagens do projeto', async () => {
      const res = await request(app)
        .get(`/api/messages/project/${projectId}`)
        .set('Authorization', `Bearer ${empresaToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].content).toBe('Mensagem de teste para GET');
    });

    it('não deve permitir que um não-participante liste as mensagens do projeto', async () => {
      const res = await request(app)
        .get(`/api/messages/project/${projectId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toEqual(403);
    });
  });

  describe('DELETE /api/messages/:id', () => {
    let messageId;
    let attachmentPath;

    beforeEach(async () => {
      // Criar uma mensagem com anexo para deletar
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .field('content', 'Mensagem para ser deletada.')
        .field('project_id', projectId)
        .attach('attachments', Buffer.from('deletable file content'), 'deletable-file.txt');
      
      messageId = res.body.id;
      attachmentPath = res.body.attachments[0].file_path;
    });

    it('deve permitir que o remetente delete sua própria mensagem (e o anexo)', async () => {
      const res = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${freelancerToken}`);
      
      expect(res.statusCode).toEqual(204);

      // Verificar se o arquivo foi deletado
      await expect(fs.access(attachmentPath)).rejects.toThrow();
    });

    it('não deve permitir que outro usuário delete a mensagem', async () => {
      const res = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${empresaToken}`); // Empresa não é o remetente

      expect(res.statusCode).toEqual(403);

      // Verificar que o arquivo AINDA existe
      await expect(fs.access(attachmentPath)).resolves.not.toThrow();
      
      // Limpeza do arquivo não deletado
      await fs.unlink(attachmentPath);
    });
  });
});