import sql from '../config/database.js';

class ProposalService {
  async createProposal(valor, descricao, freelancer_id, project_id) {
    // Verificar se o projeto existe
    const [project] = await sql`SELECT id FROM projects WHERE id = ${project_id}`;
    if (!project) {
      throw new Error('Projeto não encontrado.');
    }

    // Verificar se o usuário é realmente um freelancer (já garantido pelo middleware, mas boa prática)
    const [user] = await sql`SELECT tipo FROM users WHERE id = ${freelancer_id}`;
    if (!user || user.tipo !== 'freelancer') {
      throw new Error('Apenas freelancers podem criar propostas.');
    }

    try {
      const [proposal] = await sql`
        INSERT INTO proposals (valor, descricao, freelancer_id, project_id)
        VALUES (${valor}, ${descricao}, ${freelancer_id}, ${project_id})
        RETURNING id, valor, descricao, freelancer_id, project_id, status, criado_em
      `;
      return proposal;
    } catch (error) {
      if (error.code === '23505') { // Código de erro para violação de UNIQUE constraint
        throw new Error('Você já enviou uma proposta para este projeto.');
      }
      throw error; // Re-throw outros erros
    }
  }

  async getProposalsByProjectId(projectId) {
    const proposals = await sql`
      SELECT
        p.id, p.valor, p.descricao, p.status, p.criado_em, p.atualizado_em,
        u.id as freelancer_id, u.nome as freelancer_nome, u.email as freelancer_email
      FROM proposals p
      JOIN users u ON p.freelancer_id = u.id
      WHERE p.project_id = ${projectId}
      ORDER BY p.criado_em DESC
    `;
    return proposals;
  }

  async getProposalsByFreelancerId(freelancerId) {
    const proposals = await sql`
      SELECT
        p.id, p.valor, p.descricao, p.status, p.criado_em, p.atualizado_em,
        pr.id as project_id, pr.titulo as project_titulo, pr.descricao as project_descricao, pr.status as project_status
      FROM proposals p
      JOIN projects pr ON p.project_id = pr.id
      WHERE p.freelancer_id = ${freelancerId}
      ORDER BY p.criado_em DESC
    `;
    return proposals;
  }

  async getProposalById(proposalId) {
    const [proposal] = await sql`
      SELECT
        p.id, p.valor, p.descricao, p.status, p.criado_em, p.atualizado_em,
        u.id as freelancer_id, u.nome as freelancer_nome, u.email as freelancer_email,
        pr.id as project_id, pr.titulo as project_titulo, pr.descricao as project_descricao, pr.status as project_status, pr.empresa_id
      FROM proposals p
      JOIN users u ON p.freelancer_id = u.id
      JOIN projects pr ON p.project_id = pr.id
      WHERE p.id = ${proposalId}
    `;
    return proposal;
  }

  async updateProposalStatus(proposalId, newStatus, empresaId) {
    // Primeiro, verifica se a proposta existe e pertence a um projeto da empresa
    const [proposalToUpdate] = await sql`
      SELECT p.id, pr.empresa_id
      FROM proposals p
      JOIN projects pr ON p.project_id = pr.id
      WHERE p.id = ${proposalId} AND pr.empresa_id = ${empresaId}
    `;

    if (!proposalToUpdate) {
      throw new Error('Proposta não encontrada ou você não tem permissão para alterar seu status.');
    }

    // Verifica se o novo status é válido
    const allowedStatuses = ['pendente', 'aceita', 'recusada'];
    if (!allowedStatuses.includes(newStatus)) {
      throw new Error('Status de proposta inválido.');
    }

    const [updatedProposal] = await sql`
      UPDATE proposals
      SET status = ${newStatus}
      WHERE id = ${proposalId}
      RETURNING id, valor, descricao, freelancer_id, project_id, status, criado_em, atualizado_em
    `;
    return updatedProposal;
  }

  async deleteProposal(proposalId, freelancerId) {
    const [deletedProposal] = await sql`
      DELETE FROM proposals WHERE id = ${proposalId} AND freelancer_id = ${freelancerId} AND status = 'pendente'
      RETURNING id
    `;
    return deletedProposal;
  }
}

export default new ProposalService();