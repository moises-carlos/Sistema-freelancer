import { Router } from 'express';
import MessageController from '../controllers/message/MessageController.js';
import authorize from '../middleware/authMiddleware.js';
import upload from '../config/multerConfig.js'; // Importar o multer
import {
  validateMessageCreation,
  validateProjectIdParam,
  validateMessageId
} from '../validators/messageValidator.js';

const router = Router();

// Enviar Mensagem (com ou sem anexo)
router.post(
  '/',
  authorize(['empresa', 'freelancer']), // Empresa ou Freelancer podem enviar
  upload.array('attachments', 5), // 'attachments' é o nome do campo no formulário, 5 é o max de arquivos
  validateMessageCreation,
  MessageController.sendMessage
);

// Obter Mensagens de um Projeto
router.get(
  '/project/:projectId',
  authorize(['admin', 'empresa', 'freelancer']), // Admin, Empresa ou Freelancer podem ver
  validateProjectIdParam,
  MessageController.getProjectMessages
);

// Deletar Mensagem (apenas o remetente)
router.delete(
  '/:id',
  authorize(['empresa', 'freelancer']), // Apenas remetente pode deletar (lógica no controller)
  validateMessageId,
  MessageController.deleteMessage
);


export default router;
