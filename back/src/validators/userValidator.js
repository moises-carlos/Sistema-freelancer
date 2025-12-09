import { body, validationResult } from 'express-validator';

export const validateUser = [
  body('nome').isString().withMessage('Nome deve ser um texto.').notEmpty().withMessage('Nome é obrigatório.'),
  body('email').isEmail().withMessage('Email inválido.'),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres.'),
  body('tipo').isIn(['admin', 'empresa', 'freelancer']).withMessage('Tipo de usuário inválido.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
