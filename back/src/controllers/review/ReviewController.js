import ReviewService from '../../services/ReviewService.js';
import { validationResult } from 'express-validator';
import sql from '../../config/database.js'; // Importar 'sql' para verificações de projeto no controller

class ReviewController {
  async createReview(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, comment, reviewee_id, project_id } = req.body;
    const reviewer_id = req.user.id; // Quem está logado é o avaliador

    try {
      const review = await ReviewService.createReview(rating, comment, reviewer_id, reviewee_id, project_id);
      res.status(201).json(review);
    } catch (error) {
      console.error(error);
      if (error.message.includes('Projeto não encontrado') ||
          error.message.includes('não pode avaliar a si mesmo') ||
          error.message.includes('Avaliador não encontrado') ||
          error.message.includes('Avaliado não encontrado') ||
          error.message.includes('Você já avaliou este projeto') ||
          error.message.includes('Apenas participantes com proposta aceita no projeto')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao criar avaliação.', message: error.message });
    }
  }

  async getReviewsByRevieweeId(req, res) {
    const { revieweeId } = req.params;
    const user_id = req.user.id;
    const user_tipo = req.user.tipo;

    // Um freelancer ou empresa só pode ver suas próprias avaliações que recebeu
    if ((user_tipo === 'freelancer' || user_tipo === 'empresa') && parseInt(revieweeId) !== user_id) {
      return res.status(403).json({ error: 'Acesso negado. Você só pode ver as avaliações que você recebeu.' });
    }
    // Admin pode ver de todos

    try {
      const reviews = await ReviewService.getReviewsByRevieweeId(revieweeId);
      res.status(200).json(reviews);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar avaliações recebidas.', message: error.message });
    }
  }

  async getReviewsByReviewerId(req, res) {
    const { reviewerId } = req.params;
    const user_id = req.user.id;
    const user_tipo = req.user.tipo;

    // Um freelancer ou empresa só pode ver suas próprias avaliações que deu
    if ((user_tipo === 'freelancer' || user_tipo === 'empresa') && parseInt(reviewerId) !== user_id) {
      return res.status(403).json({ error: 'Acesso negado. Você só pode ver as avaliações que você deu.' });
    }
    // Admin pode ver de todos

    try {
      const reviews = await ReviewService.getReviewsByReviewerId(reviewerId);
      res.status(200).json(reviews);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar avaliações feitas.', message: error.message });
    }
  }

  async getReviewById(req, res) {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_tipo = req.user.tipo;

    try {
      const review = await ReviewService.getReviewById(id);
      if (!review) {
        return res.status(404).json({ error: 'Avaliação não encontrada.' });
      }

      // Verifica se o usuário logado pode ver esta avaliação
      if (user_tipo === 'freelancer' && review.reviewer_id !== user_id && review.reviewee_id !== user_id) {
        return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para ver esta avaliação.' });
      }
      if (user_tipo === 'empresa' && review.reviewer_id !== user_id && review.reviewee_id !== user_id) {
        return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para ver esta avaliação.' });
      }
      // Admin pode ver qualquer avaliação

      res.status(200).json(review);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar avaliação.', message: error.message });
    }
  }

  async updateReview(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { rating, comment } = req.body;
    const reviewer_id = req.user.id; // Apenas o autor da avaliação pode atualizá-la

    try {
      const updatedReview = await ReviewService.updateReview(id, rating, comment, reviewer_id);
      if (!updatedReview) {
        return res.status(404).json({ error: 'Avaliação não encontrada ou você não tem permissão para editá-la.' });
      }
      res.status(200).json(updatedReview);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar avaliação.', message: error.message });
    }
  }

  async deleteReview(req, res) {
    const { id } = req.params;
    const reviewer_id = req.user.id; // Apenas o autor da avaliação pode deletá-la

    try {
      const deletedReview = await ReviewService.deleteReview(id, reviewer_id);
      if (!deletedReview) {
        return res.status(404).json({ error: 'Avaliação não encontrada ou você não tem permissão para deletá-la.' });
      }
      res.status(204).send(); // 204 No Content for successful deletion
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao deletar avaliação.', message: error.message });
    }
  }
}

export default new ReviewController();
