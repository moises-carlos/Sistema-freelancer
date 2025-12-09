import express from 'express';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import proposalRoutes from './routes/proposalRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import contractRoutes from './routes/contractRoutes.js';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport'; // Importar passport
import configurePassport from './config/passportConfig.js'; // Importar configuração do passport
import session from 'express-session'; // Importar express-session

dotenv.config();

const app = express();

// Middlewares essenciais
app.use(cors()); // Habilita o CORS para todas as origens
app.use(express.json());

// Configurar sessão para Passport.js (necessário para o fluxo OAuth)
// Em produção, a chave secreta deve ser uma variável de ambiente e o store persistente
app.use(session({
  secret: process.env.SESSION_SECRET || 'umasecretasegura', // Use uma variável de ambiente aqui!
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Usar 'true' em produção com HTTPS
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session()); // Usar sessão do passport

// Configurar estratégias do Passport
configurePassport();

app.get('/', (req, res) => {
  res.send('Servidor funcionando!');
});

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contracts', contractRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Servidor rodando na porta ${process.env.PORT}`);
});
