import ContractService from '../../services/ContractService.js';
import { validationResult } from 'express-validator';

class ContractController {
  async createContract(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, terms } = req.body;
    const empresa_id = req.user.id; // Empresa logada

    // Apenas empresas podem criar contratos
    if (req.user.tipo !== 'empresa') {
      return res.status(403).json({ error: 'Apenas empresas podem criar contratos.' });
    }

    try {
      const contract = await ContractService.createContract(project_id, empresa_id, terms);
      res.status(201).json(contract);
    } catch (error) {
      console.error(error);
      if (error.message.includes('Projeto não encontrado') ||
          error.message.includes('não tem permissão') ||
          error.message.includes('Não há proposta aceita') ||
          error.message.includes('Já existe um contrato')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao criar contrato.', message: error.message });
    }
  }

  async getContractById(req, res) {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_tipo = req.user.tipo;

    try {
      const contract = await ContractService.getContractById(id);
      if (!contract) {
        return res.status(404).json({ error: 'Contrato não encontrado.' });
      }

      // Autorização para visualizar
      if (user_tipo === 'freelancer' && contract.freelancer_id !== user_id) {
        return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para visualizar este contrato.' });
      }
      if (user_tipo === 'empresa' && contract.empresa_id !== user_id) {
        return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para visualizar este contrato.' });
      }
      // Admin pode ver qualquer contrato

      res.status(200).json(contract);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar contrato.', message: error.message });
    }
  }

  async getContractsByUserId(req, res) {
    const user_id = req.user.id;
    const user_tipo = req.user.tipo;

    try {
      const contracts = await ContractService.getContractsByUserId(user_id, user_tipo);
      res.status(200).json(contracts);
    } catch (error) {
      console.error(error);
      if (error.message.includes('Tipo de usuário inválido')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao buscar contratos do usuário.', message: error.message });
    }
  }

  async updateContractStatus(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;
    const user_id = req.user.id;
    const user_tipo = req.user.tipo;

    try {
      const updatedContract = await ContractService.updateContractStatus(id, status, user_id, user_tipo);
      res.status(200).json(updatedContract);
    } catch (error) {
      console.error(error);
      if (error.message.includes('Contrato não encontrado') ||
          error.message.includes('não tem permissão') ||
          error.message.includes('Status de contrato inválido')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao atualizar status do contrato.', message: error.message });
    }
  }

  async deleteContract(req, res) {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_tipo = req.user.tipo;

    try {
      const deletedContract = await ContractService.deleteContract(id, user_id, user_tipo);
      if (!deletedContract) {
        return res.status(404).json({ error: 'Contrato não encontrado.' });
      }
      res.status(204).send(); // 204 No Content for successful deletion
    } catch (error) {
      console.error(error);
      if (error.message.includes('Apenas administradores podem deletar contratos.')) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao deletar contrato.', message: error.message });
    }
  }
}

export default new ContractController();
