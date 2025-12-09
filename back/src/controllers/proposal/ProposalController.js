import ProposalService from '../../services/ProposalService.js';
import { validationResult } from 'express-validator';
import sql from '../../config/database.js'; // Importar 'sql' para verificações de projeto no controller

class ProposalController {
  async createProposal(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { valor, descricao, project_id } = req.body;
    const freelancer_id = req.user.id; // Vem do token JWT
    const freelancer_tipo = req.user.tipo;

    if (freelancer_tipo !== 'freelancer') {
      return res.status(403).json({ error: 'Apenas freelancers podem criar propostas.' });
    }

    try {
      const proposal = await ProposalService.createProposal(valor, descricao, freelancer_id, project_id);
      res.status(201).json(proposal);
    } catch (error) {
      console.error(error);
      if (error.message === 'Projeto não encontrado.' || error.message === 'Você já enviou uma proposta para este projeto.') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao criar proposta.', message: error.message });
    }
  }

  async getProposalsByProjectId(req, res) {
    const { projectId } = req.params;
    const user_id = req.user.id;
    const user_tipo = req.user.tipo;

    try {
      // Verificar se o projeto pertence à empresa que está buscando as propostas
      const [project] = await sql`SELECT empresa_id FROM projects WHERE id = ${projectId}`;
      if (!project) {
        return res.status(404).json({ error: 'Projeto não encontrado.' });
      }
      if (user_tipo === 'empresa' && project.empresa_id !== user_id) {
        return res.status(403).json({ error: 'Acesso negado. Este projeto não pertence à sua empresa.' });
      }
      // Admin pode ver todas as propostas para qualquer projeto
      if (user_tipo === 'freelancer') {
        // Freelancer só pode ver as propostas que ele mesmo fez
        // Este endpoint lista TODAS as propostas de um projeto, então o freelancer não deveria ter acesso direto aqui,
        // a menos que seja para um projeto que ele se candidatou e foi aceito (lógica mais complexa).
        // Por ora, restringimos.
        return res.status(403).json({ error: 'Acesso negado. Freelancers não podem listar todas as propostas de um projeto.' });
      }

      const proposals = await ProposalService.getProposalsByProjectId(projectId);
      res.status(200).json(proposals);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar propostas do projeto.', message: error.message });
    }
  }

  async getProposalsByFreelancerId(req, res) {
    const { freelancerId } = req.params; // freelancerId aqui é o id do freelancer cujas propostas queremos ver
    const user_id = req.user.id; // id do usuário logado
    const user_tipo = req.user.tipo; // tipo do usuário logado

    // Um freelancer só pode ver as suas próprias propostas
    if (user_tipo === 'freelancer' && parseInt(freelancerId) !== user_id) {
      return res.status(403).json({ error: 'Acesso negado. Você só pode visualizar suas próprias propostas.' });
    }
    // Uma empresa só pode ver propostas para projetos que ela criou (precisaria de lógica mais complexa ou endpoint diferente)
    // Admin pode ver todas
    if (user_tipo === 'empresa') {
        return res.status(403).json({ error: 'Empresas não podem listar propostas por ID de freelancer diretamente. Busque por projeto.' });
    }


    try {
      const proposals = await ProposalService.getProposalsByFreelancerId(freelancerId);
      res.status(200).json(proposals);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar propostas do freelancer.', message: error.message });
    }
  }

  async getProposalById(req, res) {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_tipo = req.user.tipo;

    try {
      const proposal = await ProposalService.getProposalById(id);

      if (!proposal) {
        return res.status(404).json({ error: 'Proposta não encontrada.' });
      }

      // Autorização para visualizar uma proposta específica
      // Freelancer só pode ver sua própria proposta
      if (user_tipo === 'freelancer' && proposal.freelancer_id !== user_id) {
        return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para visualizar esta proposta.' });
      }
      // Empresa só pode ver propostas de projetos que ela possui
      if (user_tipo === 'empresa' && proposal.empresa_id !== user_id) {
        return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para visualizar esta proposta.' });
      }
      // Admin pode ver qualquer proposta

      res.status(200).json(proposal);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar proposta.', message: error.message });
    }
  }

  async updateProposalStatus(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;
    const empresa_id = req.user.id; // Quem pode alterar o status é a empresa dona do projeto
    const user_tipo = req.user.tipo;

    if (user_tipo !== 'empresa') {
      return res.status(403).json({ error: 'Apenas empresas podem alterar o status de propostas.' });
    }

    try {
      const updatedProposal = await ProposalService.updateProposalStatus(id, status, empresa_id);
      res.status(200).json(updatedProposal);
    } catch (error) {
      console.error(error);
      if (error.message.includes('não encontrada ou você não tem permissão') || error.message.includes('Status de proposta inválido')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao atualizar status da proposta.', message: error.message });
    }
  }

  async deleteProposal(req, res) {
    const { id } = req.params;
    const freelancer_id = req.user.id; // Apenas o freelancer pode deletar sua própria proposta
    const user_tipo = req.user.tipo;

    if (user_tipo !== 'freelancer') {
      return res.status(403).json({ error: 'Apenas freelancers podem deletar suas próprias propostas.' });
    }

    try {
      const deletedProposal = await ProposalService.deleteProposal(id, freelancer_id);
      if (!deletedProposal) {
        return res.status(404).json({ error: 'Proposta não encontrada ou você não tem permissão para deletá-la.' });
      }
      res.status(204).send(); // 204 No Content for successful deletion
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao deletar proposta.', message: error.message });
    }
  }
}

export default new ProposalController();
