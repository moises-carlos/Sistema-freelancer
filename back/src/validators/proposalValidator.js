import { body, param, validationResult } from 'express-validator';

export const validateProposalCreation = [
  body('valor')
    .isFloat({ min: 0 }).withMessage('Valor da proposta deve ser um número positivo.')
    .notEmpty().withMessage('Valor da proposta é obrigatório.'),
  body('descricao')
    .isString().withMessage('Descrição da proposta deve ser um texto.')
    .notEmpty().withMessage('Descrição da proposta é obrigatória.')
    .isLength({ min: 20 }).withMessage('Descrição da proposta deve ter no mínimo 20 caracteres.'),
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

export const validateProposalStatusUpdate = [
  param('id').isInt({ gt: 0 }).withMessage('ID da proposta deve ser um número inteiro positivo.'),
  body('status')
    .isString().withMessage('Status deve ser um texto.')
    .isIn(['pendente', 'aceita', 'recusada']).withMessage('Status inválido. Valores permitidos: pendente, aceita, recusada.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export const validateProposalId = [
  param('id').isInt({ gt: 0 }).withMessage('ID da proposta deve ser um número inteiro positivo.'),
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

export const validateFreelancerIdParam = [
  param('freelancerId').isInt({ gt: 0 }).withMessage('ID do freelancer deve ser um número inteiro positivo.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];