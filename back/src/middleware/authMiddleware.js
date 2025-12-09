import jwt from 'jsonwebtoken';

const authorize = (allowedTypes) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido ou mal formatado.' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!allowedTypes.includes(decoded.tipo)) {
        return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para este recurso.' });
      }

      req.user = decoded; // Adiciona os dados do usuário (id, tipo) à requisição
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado.' });
      }
      return res.status(401).json({ error: 'Token inválido.' });
    }
  };
};

export default authorize;
