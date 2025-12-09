import { body, param, validationResult } from 'express-validator';

export const validateReviewCreation = [
  body('rating')
    .isInt({ min: 1, max: 5 }).withMessage('Avaliação (rating) deve ser um número inteiro entre 1 e 5.')
    .notEmpty().withMessage('Avaliação (rating) é obrigatória.'),
  body('comment')
    .optional()
    .isString().withMessage('Comentário deve ser um texto.'),
  body('reviewee_id')
    .isInt({ gt: 0 }).withMessage('ID do avaliado deve ser um número inteiro positivo.')
    .notEmpty().withMessage('ID do avaliado é obrigatório.'),
  body('project_id')
    .isInt({ gt: 0 }).withMessage('ID do projeto deve ser um número inteiro positivo.')
    .notEmpty().withMessage('ID do projeto é obrigatório.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export const validateReviewUpdate = [
  param('id').isInt({ gt: 0 }).withMessage('ID da avaliação deve ser um número inteiro positivo.'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Avaliação (rating) deve ser um número inteiro entre 1 e 5.'),
  body('comment')
    .optional()
    .isString().withMessage('Comentário deve ser um texto.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export const validateReviewId = [
  param('id').isInt({ gt: 0 }).withMessage('ID da avaliação deve ser um número inteiro positivo.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export const validateRevieweeIdParam = [
  param('revieweeId').isInt({ gt: 0 }).withMessage('ID do avaliado deve ser um número inteiro positivo.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export const validateReviewerIdParam = [
  param('reviewerId').isInt({ gt: 0 }).withMessage('ID do avaliador deve ser um número inteiro positivo.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
