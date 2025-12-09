import { Router } from 'express';
import ReviewController from '../controllers/review/ReviewController.js';
import authorize from '../middleware/authMiddleware.js';
import {
  validateReviewCreation,
  validateReviewUpdate,
  validateReviewId,
  validateRevieweeIdParam,
  validateReviewerIdParam
} from '../validators/reviewValidator.js';

const router = Router();

// Criar Avaliação (qualquer usuário autenticado envolvido no projeto)
router.post('/', authorize(['admin', 'empresa', 'freelancer']), validateReviewCreation, ReviewController.createReview);

// Obter avaliações recebidas por um usuário (admin, ou o próprio reviewee)
router.get('/reviewee/:revieweeId', authorize(['admin', 'empresa', 'freelancer']), validateRevieweeIdParam, ReviewController.getReviewsByRevieweeId);

// Obter avaliações feitas por um usuário (admin, ou o próprio reviewer)
router.get('/reviewer/:reviewerId', authorize(['admin', 'empresa', 'freelancer']), validateReviewerIdParam, ReviewController.getReviewsByReviewerId);

// Obter Avaliação por ID (admin, reviewer, reviewee)
router.get('/:id', authorize(['admin', 'empresa', 'freelancer']), validateReviewId, ReviewController.getReviewById);

// Atualizar Avaliação (apenas o reviewer)
router.put('/:id', authorize(['admin', 'empresa', 'freelancer']), validateReviewId, validateReviewUpdate, ReviewController.updateReview);

// Deletar Avaliação (apenas o reviewer)
router.delete('/:id', authorize(['admin', 'empresa', 'freelancer']), validateReviewId, ReviewController.deleteReview);

export default router;
