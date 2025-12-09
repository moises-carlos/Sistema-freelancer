import sql from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

// beforeEach é executado antes de cada teste em todos os arquivos de teste
beforeEach(async () => {
  // Limpar todas as tabelas e reiniciar as sequências de ID para garantir isolamento
  // A ordem não importa com TRUNCATE ... CASCADE
  try {
    await sql`
      TRUNCATE
        users,
        projects,
        proposals,
        reviews,
        messages,
        attachments,
        contracts
      RESTART IDENTITY CASCADE;
    `;
  } catch (error) {
    console.error("Erro ao truncar tabelas:", error);
  }
});

// afterAll é executado uma vez após todos os testes em todos os arquivos
afterAll(async () => {
  // Fechar a conexão com o banco de dados para que o Jest possa sair
  await sql.end();
});