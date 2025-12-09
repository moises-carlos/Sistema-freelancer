import ProjectService from '../../services/ProjectService.js';
import { validationResult } from 'express-validator';

class ProjectController {
  async createProject(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { titulo, descricao } = req.body;
    const empresa_id = req.user.id; // Vem do token JWT

    try {
      const project = await ProjectService.createProject(titulo, descricao, empresa_id);
      res.status(201).json(project);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar projeto', message: error.message });
    }
  }

  async getProjects(req, res) {
    try {
      const projects = await ProjectService.getProjects();
      res.status(200).json(projects);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar projetos', message: error.message });
    }
  }

  async getProjectById(req, res) {
    const { id } = req.params;
    try {
      const project = await ProjectService.getProjectById(id);
      if (!project) {
        return res.status(404).json({ error: 'Projeto não encontrado' });
      }
      res.status(200).json(project);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar projeto', message: error.message });
    }
  }

  async getMyProjects(req, res) {
    const empresa_id = req.user.id;
    try {
      const projects = await ProjectService.getProjectsByEmpresaId(empresa_id);
      res.status(200).json(projects);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar os projetos da empresa.', message: error.message });
    }
  }

  async updateProject(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { titulo, descricao, status } = req.body;
    const empresa_id = req.user.id; // Dono do projeto

    try {
      const updatedProject = await ProjectService.updateProject(id, titulo, descricao, status, empresa_id);
      if (!updatedProject) {
        return res.status(404).json({ error: 'Projeto não encontrado ou você não tem permissão para editá-lo.' });
      }
      res.status(200).json(updatedProject);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar projeto', message: error.message });
    }
  }

  async deleteProject(req, res) {
    const { id } = req.params;
    const empresa_id = req.user.id; // Dono do projeto

    try {
      const deletedProject = await ProjectService.deleteProject(id, empresa_id);
      if (!deletedProject) {
        return res.status(404).json({ error: 'Projeto não encontrado ou você não tem permissão para deletá-lo.' });
      }
      res.status(204).send(); // 204 No Content for successful deletion
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao deletar projeto', message: error.message });
    }
  }
}

export default new ProjectController();