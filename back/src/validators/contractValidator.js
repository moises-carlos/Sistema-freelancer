import { body, param, validationResult } from 'express-validator';

export const validateContractCreation = [
  body('project_id')
    .isInt({ gt: 0 }).withMessage('ID do projeto deve ser um número inteiro positivo.')
    .notEmpty().withMessage('ID do projeto é obrigatório.'),
  body('terms')
    .isString().withMessage('Termos do contrato devem ser um texto.')
    .notEmpty().withMessage('Termos do contrato são obrigatórios.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export const validateContractUpdateStatus = [
  param('id').isInt({ gt: 0 }).withMessage('ID do contrato deve ser um número inteiro positivo.'),
  body('status')
    .isString().withMessage('Status deve ser um texto.')
    .isIn(['ativo', 'finalizado', 'quebrado']).withMessage('Status inválido. Valores permitidos: ativo, finalizado, quebrado.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export const validateContractId = [
  param('id').isInt({ gt: 0 }).withMessage('ID do contrato deve ser um número inteiro positivo.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];