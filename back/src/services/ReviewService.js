import sql from '../config/database.js';

class ReviewService {
  async createReview(rating, comment, reviewer_id, reviewee_id, project_id) {
    // 1. Validar se o projeto existe
    const [project] = await sql`SELECT id, empresa_id FROM projects WHERE id = ${project_id}`;
    if (!project) {
      throw new Error('Projeto não encontrado.');
    }

    // 2. Validar se reviewer_id e reviewee_id são usuários válidos e diferentes
    if (reviewer_id === reviewee_id) {
      throw new Error('Você não pode avaliar a si mesmo.');
    }
    const [reviewer] = await sql`SELECT id, tipo FROM users WHERE id = ${reviewer_id}`;
    if (!reviewer) { throw new Error('Avaliador não encontrado.'); }
    const [reviewee] = await sql`SELECT id, tipo FROM users WHERE id = ${reviewee_id}`;
    if (!reviewee) { throw new Error('Avaliado não encontrado.'); }


    // 3. Lógica para garantir que apenas participantes do projeto podem avaliar
    let isParticipant = false;

    // Caso 1: Freelancer avaliando a Empresa
    if (reviewer.tipo === 'freelancer' && reviewee.tipo === 'empresa') {
        if (project.empresa_id === reviewee_id) { // A empresa avaliada é a dona do projeto?
            const [proposal] = await sql`
                SELECT id FROM proposals
                WHERE project_id = ${project_id} AND freelancer_id = ${reviewer_id} AND status = 'aceita'`;
            if (proposal) isParticipant = true;
        }
    }
    // Caso 2: Empresa avaliando o Freelancer
    else if (reviewer.tipo === 'empresa' && reviewee.tipo === 'freelancer') {
        if (project.empresa_id === reviewer_id) { // A empresa avaliadora é a dona do projeto?
            const [proposal] = await sql`
                SELECT id FROM proposals
                WHERE project_id = ${project_id} AND freelancer_id = ${reviewee_id} AND status = 'aceita'`;
            if (proposal) isParticipant = true;
        }
    }

    if (!isParticipant) {
        throw new Error('Apenas participantes com proposta aceita no projeto podem deixar avaliações.');
    }


    // 4. Inserir a avaliação no banco
    try {
      const [review] = await sql`
        INSERT INTO reviews (rating, comment, reviewer_id, reviewee_id, project_id)
        VALUES (${rating}, ${comment}, ${reviewer_id}, ${reviewee_id}, ${project_id})
        RETURNING id, rating, comment, reviewer_id, reviewee_id, project_id, criado_em
      `;
      return review;
    } catch (error) {
      if (error.code === '23505') { // Código de erro para violação de UNIQUE constraint
        throw new Error('Você já avaliou este projeto.');
      }
      throw error;
    }
  }

  async getReviewsByRevieweeId(revieweeId) {
    const reviews = await sql`
      SELECT
        r.id, r.rating, r.comment, r.criado_em,
        reviewer.id as reviewer_id, reviewer.nome as reviewer_nome, reviewer.tipo as reviewer_tipo,
        project.id as project_id, project.titulo as project_titulo
      FROM reviews r
      JOIN users reviewer ON r.reviewer_id = reviewer.id
      JOIN projects project ON r.project_id = project.id
      WHERE r.reviewee_id = ${revieweeId}
      ORDER BY r.criado_em DESC
    `;
    return reviews;
  }

  async getReviewsByReviewerId(reviewerId) {
    const reviews = await sql`
      SELECT
        r.id, r.rating, r.comment, r.criado_em,
        reviewee.id as reviewee_id, reviewee.nome as reviewee_nome, reviewee.tipo as reviewee_tipo,
        project.id as project_id, project.titulo as project_titulo
      FROM reviews r
      JOIN users reviewee ON r.reviewee_id = reviewee.id
      JOIN projects project ON r.project_id = project.id
      WHERE r.reviewer_id = ${reviewerId}
      ORDER BY r.criado_em DESC
    `;
    return reviews;
  }

  async getReviewById(reviewId) {
    const [review] = await sql`
      SELECT
        r.id, r.rating, r.comment, r.criado_em, r.atualizado_em,
        reviewer.id as reviewer_id, reviewer.nome as reviewer_nome, reviewer.tipo as reviewer_tipo,
        reviewee.id as reviewee_id, reviewee.nome as reviewee_nome, reviewee.tipo as reviewee_tipo,
        project.id as project_id, project.titulo as project_titulo
      FROM reviews r
      JOIN users reviewer ON r.reviewer_id = reviewer.id
      JOIN users reviewee ON r.reviewee_id = reviewee.id
      JOIN projects project ON r.project_id = project.id
      WHERE r.id = ${reviewId}
    `;
    return review;
  }

  async updateReview(reviewId, rating, comment, reviewerId) {
    const [updatedReview] = await sql`
      UPDATE reviews
      SET
        rating = COALESCE(${rating ?? null}, rating),
        comment = COALESCE(${comment ?? null}, comment)
      WHERE id = ${reviewId} AND reviewer_id = ${reviewerId}
      RETURNING id, rating, comment, reviewer_id, reviewee_id, project_id, criado_em, atualizado_em
    `;
    return updatedReview;
  }

  async deleteReview(reviewId, reviewerId) {
    const [deletedReview] = await sql`
      DELETE FROM reviews WHERE id = ${reviewId} AND reviewer_id = ${reviewerId}
      RETURNING id
    `;
    return deletedReview;
  }
}

export default new ReviewService();