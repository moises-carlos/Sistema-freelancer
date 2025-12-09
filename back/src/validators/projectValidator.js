import { body, param, validationResult } from 'express-validator';

export const validateProjectCreation = [
  body('titulo')
    .isString().withMessage('Título deve ser um texto.')
    .notEmpty().withMessage('Título é obrigatório.')
    .isLength({ min: 5 }).withMessage('Título deve ter no mínimo 5 caracteres.'),
  body('descricao')
    .isString().withMessage('Descrição deve ser um texto.')
    .notEmpty().withMessage('Descrição é obrigatória.')
    .isLength({ min: 20 }).withMessage('Descrição deve ter no mínimo 20 caracteres.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export const validateProjectUpdate = [
  param('id').isInt().withMessage('ID do projeto deve ser um número inteiro.'),
  body('titulo')
    .optional() // É opcional na atualização
    .isString().withMessage('Título deve ser um texto.')
    .isLength({ min: 5 }).withMessage('Título deve ter no mínimo 5 caracteres.'),
  body('descricao')
    .optional() // É opcional na atualização
    .isString().withMessage('Descrição deve ser um texto.')
    .isLength({ min: 20 }).withMessage('Descrição deve ter no mínimo 20 caracteres.'),
  body('status')
    .optional() // É opcional na atualização
    .isIn(['aberto', 'em andamento', 'finalizado', 'cancelado'])
    .withMessage('Status inválido. Valores permitidos: aberto, em andamento, finalizado, cancelado.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export const validateProjectId = [
  param('id').isInt().withMessage('ID do projeto deve ser um número inteiro.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
