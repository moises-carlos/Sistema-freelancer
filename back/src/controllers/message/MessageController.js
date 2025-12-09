import MessageService from '../../services/MessageService.js';
import { validationResult } from 'express-validator';
import fs from 'fs/promises'; // Para deletar arquivos

class MessageController {
  async sendMessage(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Se houver erros de validação, e houver arquivos, precisa deletá-los
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          fs.unlink(file.path).catch(err => console.error("Erro ao deletar arquivo após validação falhar:", err));
        });
      }
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, project_id } = req.body;
    const sender_id = req.user.id;
    const files = req.files; // Arquivos enviados via multer

    try {
      const message = await MessageService.createMessage(content, sender_id, project_id, files);
      res.status(201).json(message);
    } catch (error) {
      console.error(error);
      // Se a criação falhar no service, deletar os arquivos que já foram salvos
      if (files && files.length > 0) {
        files.forEach(file => {
          fs.unlink(file.path).catch(err => console.error("Erro ao deletar arquivo após service falhar:", err));
        });
      }
      if (error.message.includes('Projeto não encontrado') || error.message.includes('Você não é participante') || error.message.includes('Mensagem deve ter conteúdo')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao enviar mensagem.', message: error.message });
    }
  }

  async getProjectMessages(req, res) {
    const { projectId } = req.params;
    const userId = req.user.id;
    const userType = req.user.tipo;

    try {
      const messages = await MessageService.getMessagesByProjectId(projectId, userId, userType);
      res.status(200).json(messages);
    } catch (error) {
      console.error(error);
      if (error.message.includes('Projeto não encontrado') || error.message.includes('Você não é participante')) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao buscar mensagens do projeto.', message: error.message });
    }
  }

  async deleteMessage(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const deletedMessage = await MessageService.deleteMessage(id, userId);
      if (!deletedMessage) {
        return res.status(404).json({ error: 'Mensagem não encontrada ou você não tem permissão para deletá-la.' });
      }
      res.status(204).send();
    } catch (error) {
      console.error(error);
      if (error.message.includes('Mensagem não encontrada') || error.message.includes('permissão para deletar')) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao deletar mensagem.', message: error.message });
    }
  }
}

export default new MessageController();
