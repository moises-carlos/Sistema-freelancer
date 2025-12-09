import { Router } from 'express';
import ProjectController from '../controllers/project/ProjectController.js';
import authorize from '../middleware/authMiddleware.js';
import { validateProjectCreation, validateProjectUpdate, validateProjectId } from '../validators/projectValidator.js';

const router = Router();

// Criar Projeto (apenas 'empresa')
router.post('/', authorize(['empresa']), validateProjectCreation, ProjectController.createProject);

// Listar todos os Projetos (público)
// Futuramente, pode-se adicionar filtros ou paginação.
router.get('/', ProjectController.getProjects);

// Obter os projetos da empresa autenticada
router.get(
  '/my',
  authorize(['empresa']),
  ProjectController.getMyProjects
);

// Obter Projeto por ID (público) - permitir que visitantes vejam detalhes do projeto
router.get('/:id', validateProjectId, ProjectController.getProjectById);

// Atualizar Projeto (apenas 'empresa' e o dono do projeto)
// A validação de 'empresa_id' é feita no serviço.
router.put('/:id', authorize(['empresa']), validateProjectId, validateProjectUpdate, ProjectController.updateProject);

// Deletar Projeto (apenas 'empresa' e o dono do projeto)
// A validação de 'empresa_id' é feita no serviço.
router.delete('/:id', authorize(['empresa']), validateProjectId, ProjectController.deleteProject);

export default router;