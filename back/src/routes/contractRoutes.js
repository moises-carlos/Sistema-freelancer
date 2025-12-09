import { Router } from 'express';
import ContractController from '../controllers/contract/ContractController.js';
import authorize from '../middleware/authMiddleware.js';
import {
  validateContractCreation,
  validateContractUpdateStatus,
  validateContractId
} from '../validators/contractValidator.js';

const router = Router();

// Criar Contrato (apenas 'empresa')
router.post(
  '/',
  authorize(['empresa']),
  validateContractCreation,
  ContractController.createContract
);

// Obter todos os contratos do usuário autenticado
// IMPORTANTE: Esta rota estática deve vir ANTES da rota dinâmica '/:id'
router.get(
  '/my',
  authorize(['empresa', 'freelancer']),
  ContractController.getContractsByUserId
);

// Obter um Contrato por ID (participantes ou admin)
router.get(
  '/:id',
  authorize(['admin', 'empresa', 'freelancer']),
  validateContractId,
  ContractController.getContractById
);

// Atualizar Status do Contrato (apenas 'empresa' ou 'admin')
router.patch(
  '/:id/status',
  authorize(['admin', 'empresa']),
  validateContractId,
  validateContractUpdateStatus,
  ContractController.updateContractStatus
);

// Deletar Contrato (apenas 'admin')
router.delete(
  '/:id',
  authorize(['admin']),
  validateContractId,
  ContractController.deleteContract
);

export default router;
