import sql from '../config/database.js';

class ContractService {
  async createContract(project_id, empresa_id, terms) {
    // 1. Verificar se o projeto existe e pertence à empresa
    const [project] = await sql`SELECT id, empresa_id, status FROM projects WHERE id = ${project_id}`;
    if (!project) {
      throw new Error('Projeto não encontrado.');
    }
    if (project.empresa_id !== empresa_id) {
      throw new Error('Você não tem permissão para criar contrato para este projeto.');
    }

    // 2. Verificar se já existe uma proposta aceita para este projeto
    const [acceptedProposal] = await sql`
      SELECT id, freelancer_id, valor FROM proposals
      WHERE project_id = ${project_id} AND status = 'aceita'
    `;
    if (!acceptedProposal) {
      throw new Error('Não há proposta aceita para este projeto para gerar um contrato.');
    }

    // 3. Verificar se já existe um contrato para este projeto
    const [existingContract] = await sql`SELECT id FROM contracts WHERE project_id = ${project_id}`;
    if (existingContract) {
      throw new Error('Já existe um contrato para este projeto.');
    }

    // 4. Criar o contrato
    try {
      const [contract] = await sql`
        INSERT INTO contracts (terms, valor, project_id, freelancer_id, empresa_id)
        VALUES (${terms}, ${acceptedProposal.valor}, ${project_id}, ${acceptedProposal.freelancer_id}, ${empresa_id})
        RETURNING id, terms, valor, status, project_id, freelancer_id, empresa_id, criado_em
      `;
      // Opcional: Atualizar o status do projeto para 'em andamento' após a criação do contrato
      await sql`UPDATE projects SET status = 'em andamento' WHERE id = ${project_id}`;

      return contract;
    } catch (error) {
      if (error.code === '23505') { // UNIQUE constraint violation (project_id)
        throw new Error('Já existe um contrato para este projeto.');
      }
      throw error;
    }
  }

  async getContractById(contractId) {
    const [contract] = await sql`
      SELECT
        c.id, c.terms, c.valor, c.status, c.criado_em, c.atualizado_em,
        p.id as project_id, p.titulo as project_titulo,
        f.id as freelancer_id, f.nome as freelancer_nome,
        e.id as empresa_id, e.nome as empresa_nome
      FROM contracts c
      JOIN projects p ON c.project_id = p.id
      JOIN users f ON c.freelancer_id = f.id
      JOIN users e ON c.empresa_id = e.id
      WHERE c.id = ${contractId}
    `;
    return contract;
  }

  async getContractsByUserId(userId, userType) {
    let contracts;
    if (userType === 'freelancer') {
      contracts = await sql`
        SELECT
          c.id, c.terms, c.valor, c.status, c.criado_em, c.atualizado_em,
          p.id as project_id, p.titulo as project_titulo,
          e.nome as empresa_nome
        FROM contracts c
        JOIN projects p ON c.project_id = p.id
        JOIN users e ON c.empresa_id = e.id
        WHERE c.freelancer_id = ${userId}
        ORDER BY c.criado_em DESC
      `;
    } else if (userType === 'empresa') {
      contracts = await sql`
        SELECT
          c.id, c.terms, c.valor, c.status, c.criado_em, c.atualizado_em,
          p.id as project_id, p.titulo as project_titulo,
          f.nome as freelancer_nome
        FROM contracts c
        JOIN projects p ON c.project_id = p.id
        JOIN users f ON c.freelancer_id = f.id
        WHERE c.empresa_id = ${userId}
        ORDER BY c.criado_em DESC
      `;
    } else if (userType === 'admin') {
      contracts = await sql`
        SELECT
          c.id, c.terms, c.valor, c.status, c.criado_em, c.atualizado_em,
          p.id as project_id, p.titulo as project_titulo,
          f.nome as freelancer_nome,
          e.nome as empresa_nome
        FROM contracts c
        JOIN projects p ON c.project_id = p.id
        JOIN users f ON c.freelancer_id = f.id
        JOIN users e ON c.empresa_id = e.id
        ORDER BY c.criado_em DESC
      `;
    } else {
      throw new Error('Tipo de usuário inválido para buscar contratos.');
    }
    return contracts;
  }

  async updateContractStatus(contractId, newStatus, userId, userType) {
    // Apenas a empresa (dona do contrato) ou admin pode mudar o status
    const [contract] = await sql`SELECT empresa_id FROM contracts WHERE id = ${contractId}`;
    if (!contract) {
      throw new Error('Contrato não encontrado.');
    }
    if (userType !== 'admin' && contract.empresa_id !== userId) {
      throw new Error('Você não tem permissão para alterar o status deste contrato.');
    }

    const allowedStatuses = ['ativo', 'finalizado', 'quebrado'];
    if (!allowedStatuses.includes(newStatus)) {
      throw new Error('Status de contrato inválido.');
    }

    const [updatedContract] = await sql`
      UPDATE contracts
      SET status = ${newStatus}
      WHERE id = ${contractId}
      RETURNING id, status, atualizado_em
    `;
    return updatedContract;
  }

  // Deletar contrato (apenas admin, ou pela empresa se o status for "ativo"?)
  // Para este sistema simulado, vamos permitir apenas admin deletar por segurança.
  async deleteContract(contractId, userId, userType) {
    if (userType !== 'admin') {
      throw new Error('Apenas administradores podem deletar contratos.');
    }

    const [deletedContract] = await sql`
      DELETE FROM contracts WHERE id = ${contractId}
      RETURNING id
    `;
    return deletedContract;
  }
}

export default new ContractService();