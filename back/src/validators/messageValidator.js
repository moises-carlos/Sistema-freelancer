import { body, param, validationResult } from 'express-validator';

export const validateMessageCreation = [
  body('content')
    .optional()
    .isString().withMessage('Conteúdo da mensagem deve ser um texto.'),
  body('project_id')
    .isInt({ gt: 0 }).withMessage('ID do projeto deve ser um número inteiro positivo.')
    .notEmpty().withMessage('ID do projeto é obrigatório.'),
  // Validação customizada para garantir que content ou files existam
  body().custom((value, { req }) => {
    if (!req.body.content && (!req.files || req.files.length === 0)) {
      throw new Error('Mensagem deve ter conteúdo ou anexos.');
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export const validateProjectIdParam = [
  param('projectId').isInt({ gt: 0 }).withMessage('ID do projeto deve ser um número inteiro positivo.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export const validateMessageId = [
  param('id').isInt({ gt: 0 }).withMessage('ID da mensagem deve ser um número inteiro positivo.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
