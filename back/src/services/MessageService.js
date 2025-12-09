import sql from '../config/database.js';
import fs from 'fs/promises'; // Para deletar arquivos

class MessageService {
  async createMessage(content, sender_id, project_id, files = []) {
    // 1. Verificar se o remetente é participante do projeto
    const [project] = await sql`SELECT empresa_id FROM projects WHERE id = ${project_id}`;
    if (!project) {
      throw new Error('Projeto não encontrado.');
    }

    const [senderUser] = await sql`SELECT tipo FROM users WHERE id = ${sender_id}`;
    if (!senderUser) {
      throw new Error('Remetente não encontrado.');
    }

    let isParticipant = false;
    // O remetente é a empresa dona do projeto
    if (sender_id === project.empresa_id) {
      isParticipant = true;
    } else {
      // O remetente é um freelancer com proposta aceita no projeto
      const [acceptedProposal] = await sql`
        SELECT id FROM proposals
        WHERE project_id = ${project_id} AND freelancer_id = ${sender_id} AND status = 'aceita'
      `;
      if (acceptedProposal) {
        isParticipant = true;
      }
    }

    if (!isParticipant) {
      throw new Error('Você não é participante deste projeto para enviar mensagens.');
    }

    // 2. Validar se a mensagem tem conteúdo OU anexos
    if (!content && files.length === 0) {
      throw new Error('Mensagem deve ter conteúdo ou anexos.');
    }

    // 3. Inserir a mensagem principal
    const [message] = await sql`
      INSERT INTO messages (content, sender_id, project_id)
      VALUES (${content || null}, ${sender_id}, ${project_id})
      RETURNING id, content, sender_id, project_id, criado_em, atualizado_em
    `;

    // 4. Inserir anexos, se houver
    const attachments = [];
    if (files.length > 0) {
      for (const file of files) {
        const [attachment] = await sql`
          INSERT INTO attachments (file_name, file_path, file_type, file_size, message_id, uploader_id, project_id)
          VALUES (${file.originalname}, ${file.path}, ${file.mimetype}, ${file.size}, ${message.id}, ${sender_id}, ${project_id})
          RETURNING id, file_name, file_path, file_type, file_size, criado_em
        `;
        attachments.push(attachment);
      }
    }

    return { ...message, attachments };
  }

  async getMessagesByProjectId(projectId, userId, userType) {
    // Verificar se o usuário é participante do projeto
    const [project] = await sql`SELECT empresa_id FROM projects WHERE id = ${projectId}`;
    if (!project) {
      throw new Error('Projeto não encontrado.');
    }

    let isParticipant = false;
    if (userId === project.empresa_id || userType === 'admin') { // Empresa dona do projeto ou Admin
      isParticipant = true;
    } else if (userType === 'freelancer') {
      const [acceptedProposal] = await sql`
        SELECT id FROM proposals
        WHERE project_id = ${projectId} AND freelancer_id = ${userId} AND status = 'aceita'
      `;
      if (acceptedProposal) {
        isParticipant = true;
      }
    }

    if (!isParticipant) {
      throw new Error('Você não é participante deste projeto para visualizar as mensagens.');
    }

    const messages = await sql`
      SELECT
        m.id, m.content, m.criado_em, m.atualizado_em,
        s.id as sender_id, s.nome as sender_nome, s.tipo as sender_tipo,
        p.id as project_id, p.titulo as project_titulo
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN projects p ON m.project_id = p.id
      WHERE m.project_id = ${projectId}
      ORDER BY m.criado_em ASC
    `;

    // Buscar anexos para cada mensagem
    for (const message of messages) {
      message.attachments = await sql`
        SELECT id, file_name, file_path, file_type, file_size, criado_em
        FROM attachments
        WHERE message_id = ${message.id}
      `;
    }

    return messages;
  }

  async deleteMessage(messageId, userId) {
    const [messageToDelete] = await sql`
      SELECT sender_id FROM messages WHERE id = ${messageId}
    `;

    if (!messageToDelete) {
      throw new Error('Mensagem não encontrada.');
    }

    if (messageToDelete.sender_id !== userId) {
      throw new Error('Você não tem permissão para deletar esta mensagem.');
    }

    // Deletar arquivos físicos antes de deletar do DB
    const attachments = await sql`SELECT file_path FROM attachments WHERE message_id = ${messageId}`;
    for (const attachment of attachments) {
      try {
        await fs.unlink(attachment.file_path);
      } catch (error) {
        console.error(`Erro ao deletar arquivo físico ${attachment.file_path}:`, error);
        // Não impede a deleção da mensagem no DB, mas loga o erro
      }
    }

    const [deletedMessage] = await sql`
      DELETE FROM messages WHERE id = ${messageId} AND sender_id = ${userId}
      RETURNING id
    `;
    return deletedMessage;
  }
}

export default new MessageService();