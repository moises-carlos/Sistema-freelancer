import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Title, Text, Button, Paper, Grid, Card, Badge, Group, Loader, Textarea, TextInput, Affix } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { notifications } from '@mantine/notifications';
import { CheckCircle, XCircle } from 'lucide-react';

// Interfaces
interface Project {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  empresa_id: number;
}
interface Proposal {
  id: number;
  valor: string;
  descricao: string;
  status: string;
  freelancer_id: number;
  freelancer_nome: string;
}
interface Message {
  id: number;
  content: string;
  sender_id: number;
  criado_em: string;
}

// Sub-componentes para melhor organização

const ProjectInfo: React.FC<{ project: Project }> = ({ project }) => (
  <Paper shadow="sm" p="lg" withBorder>
    <Title order={2} mb="md">{project.titulo}</Title>
    <Badge mb="md">{project.status}</Badge>
    <Text c="dimmed">{project.descricao}</Text>
  </Paper>
);

const ProposalForm: React.FC<{ projectId: number; onProposalSubmit: () => void }> = ({ projectId, onProposalSubmit }) => {
  const form = useForm({
    initialValues: { valor: '', descricao: '' },
    validate: {
      valor: (value) => (Number(value) > 0 ? null : 'O valor deve ser positivo'),
      descricao: (value) => (value.length > 10 ? null : 'A descrição deve ter mais de 10 caracteres'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await api.post('/proposals', { ...values, project_id: projectId });
      notifications.show({ title: 'Sucesso', message: 'Proposta enviada!', color: 'green' });
      onProposalSubmit(); // Callback para recarregar os dados
    } catch (err) {
      notifications.show({ title: 'Erro', message: 'Falha ao enviar proposta.', color: 'red' });
    }
  };

  return (
    <Paper shadow="sm" p="lg" withBorder>
      <Title order={3} mb="md">Enviar Proposta</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput label="Valor (R$)" placeholder="1500.00" required {...form.getInputProps('valor')} />
        <Textarea label="Sua Mensagem" placeholder="Descreva sua abordagem..." required mt="md" minRows={4} {...form.getInputProps('descricao')} />
        <Button type="submit" mt="md" fullWidth>Enviar</Button>
      </form>
    </Paper>
  );
};

const ProposalsList: React.FC<{ proposals: Proposal[]; onStatusUpdate: (proposalId: number, status: 'aceita' | 'recusada') => void }> = ({ proposals, onStatusUpdate }) => (
    <Paper shadow="sm" p="lg" withBorder>
        <Title order={3} mb="md">Propostas Recebidas ({proposals.length})</Title>
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {proposals.map(p => (
                <Card key={p.id} withBorder mb="sm">
                    <Title order={5}>{p.freelancer_nome}</Title>
                    <Text c="dimmed" size="sm">Valor: R$ {parseFloat(p.valor).toLocaleString('pt-BR')}</Text>
                    <Text size="sm" my="sm">{p.descricao}</Text>
                    {p.status === 'pendente' ? (
                        <Group>
                            <Button onClick={() => onStatusUpdate(p.id, 'aceita')} color="green" leftSection={<CheckCircle size={16}/>}>Aceitar</Button>
                            <Button onClick={() => onStatusUpdate(p.id, 'recusada')} variant="outline" color="red" leftSection={<XCircle size={16}/>}>Recusar</Button>
                        </Group>
                    ) : <Badge>{p.status}</Badge>}
                </Card>
            ))}
        </div>
    </Paper>
);

const ProjectChat: React.FC<{ projectId: number; initialMessages: Message[]; user: any; onMessageSend: () => void }> = ({ projectId, initialMessages, user, onMessageSend }) => {
    const [newMessage, setNewMessage] = useState('');
  
    const handleSendMessage = async () => {
      if (newMessage.trim()) {
        try {
          await api.post('/messages', { content: newMessage, project_id: projectId });
          setNewMessage('');
          onMessageSend();
        } catch (err) {
          notifications.show({ title: 'Erro', message: 'Falha ao enviar mensagem.', color: 'red' });
        }
      }
    };
  
    return (
      <Paper shadow="sm" p="lg" withBorder style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Title order={3} mb="md">Chat do Projeto</Title>
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
          {initialMessages.map(msg => (
            <div key={msg.id} style={{ textAlign: msg.sender_id === user.id ? 'right' : 'left', marginBottom: '0.5rem' }}>
              <Badge color={msg.sender_id === user.id ? 'blue' : 'gray'} variant="light" p="md" radius="lg">
                {msg.content}
              </Badge>
            </div>
          ))}
        </div>
        <Group>
          <TextInput style={{ flex: 1 }} value={newMessage} onChange={(e) => setNewMessage(e.currentTarget.value)} placeholder="Digite sua mensagem..."/>
          <Button onClick={handleSendMessage}>Enviar</Button>
        </Group>
      </Paper>
    );
  };


export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const projectRes = await api.get(`/projects/${id}`);
      setProject(projectRes.data);

      if (user) {
        try {
          const messagesRes = await api.get(`/messages/project/${id}`);
          setMessages(messagesRes.data);
        } catch (msgErr) {
          console.log("Não foi possível carregar mensagens (usuário pode não ser participante)", msgErr);
          setMessages([]);
        }

        try {
          if (user.tipo === 'empresa') {
            const proposalsRes = await api.get(`/proposals/project/${id}`);
            setProposals(proposalsRes.data);
          } else if (user.tipo === 'freelancer') {
            // Freelancer só vê a sua proposta para este projeto
            const allProposalsRes = await api.get(`/proposals/project/${id}`);
            const myProposal = allProposalsRes.data.filter((p: Proposal) => p.freelancer_id === user.id);
            setProposals(myProposal);
          }
        } catch (propErr) {
          console.log("Não foi possível carregar propostas", propErr);
          setProposals([]);
        }
      }
    } catch (err) {
      setError('Falha ao carregar dados do projeto.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProposalUpdate = async (proposalId: number, status: 'aceita' | 'recusada') => {
    try {
      await api.patch(`/proposals/${proposalId}/status`, { status });
      notifications.show({ title: 'Sucesso', message: `Proposta ${status}!`, color: 'green' });
      fetchData(); // Recarregar dados
    } catch (err) {
      notifications.show({ title: 'Erro', message: 'Falha ao atualizar proposta.', color: 'red' });
    }
  };

  if (loading) return <Group justify="center" mt="xl"><Loader /></Group>;
  if (error) return <Text c="red">{error}</Text>;
  if (!project) return <Text>Projeto não encontrado.</Text>;
  
  const userHasSubmittedProposal = proposals.some(p => p.freelancer_id === user?.id);
  const canChat = user?.tipo === 'empresa' || proposals.some(p => p.freelancer_id === user?.id && p.status === 'aceita');

  return (
    <Container my="md">
        <Grid>
            <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
                <ProjectInfo project={project} />
            </Grid.Col>

            {user?.tipo === 'empresa' && (
                <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
                    <ProposalsList proposals={proposals} onStatusUpdate={handleProposalUpdate}/>
                </Grid.Col>
            )}

            {user?.tipo === 'freelancer' && !userHasSubmittedProposal && (
                <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
                    <ProposalForm projectId={project.id} onProposalSubmit={fetchData}/>
                </Grid.Col>
            )}

            {user?.tipo === 'freelancer' && userHasSubmittedProposal && (
                <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
                    <Paper shadow="sm" p="lg" withBorder>
                        <Title order={3}>Sua Proposta</Title>
                        <Badge>{proposals[0].status}</Badge>
                        <Text mt="sm">Valor: R$ {parseFloat(proposals[0].valor).toLocaleString('pt-BR')}</Text>
                    </Paper>
                </Grid.Col>
            )}

            {canChat && (
                <Grid.Col span={12}>
                    <ProjectChat projectId={project.id} initialMessages={messages} user={user} onMessageSend={fetchData} />
                </Grid.Col>
            )}
        </Grid>
    </Container>
  );
}