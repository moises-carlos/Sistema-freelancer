import { Router } from 'express';
import ProposalController from '../controllers/proposal/ProposalController.js';
import authorize from '../middleware/authMiddleware.js';
import {
  validateProposalCreation,
  validateProposalStatusUpdate,
  validateProposalId,
  validateProjectIdParam,
  validateFreelancerIdParam
} from '../validators/proposalValidator.js';

const router = Router();

// Criar Proposta (apenas 'freelancer')
router.post('/', authorize(['freelancer']), validateProposalCreation, ProposalController.createProposal);

// Obter Propostas por ID de Projeto (apenas 'empresa' que é dona do projeto ou 'admin')
router.get('/project/:projectId', authorize(['admin', 'empresa', 'freelancer']), validateProjectIdParam, ProposalController.getProposalsByProjectId);

// Obter Propostas por ID de Freelancer (apenas o próprio 'freelancer' ou 'admin')
router.get('/freelancer/:freelancerId', authorize(['admin', 'freelancer']), validateFreelancerIdParam, ProposalController.getProposalsByFreelancerId);

// Obter Proposta por ID (dono da proposta, dono do projeto, ou 'admin')
router.get('/:id', authorize(['admin', 'empresa', 'freelancer']), validateProposalId, ProposalController.getProposalById);

// Atualizar Status da Proposta (apenas 'empresa' dona do projeto)
router.patch('/:id/status', authorize(['empresa']), validateProposalId, validateProposalStatusUpdate, ProposalController.updateProposalStatus);

// Deletar Proposta (apenas 'freelancer' que é dono da proposta, e se estiver 'pendente')
router.delete('/:id', authorize(['freelancer']), validateProposalId, ProposalController.deleteProposal);

export default router;
