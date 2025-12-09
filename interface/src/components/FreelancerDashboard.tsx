import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Title, Text, Card, Grid, Badge, Group, Loader, Button } from '@mantine/core';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface Proposal {
  id: number;
  project_titulo: string;
  status: string;
  valor: string;
  descricao: string;
  project_id: number;
}

export default function FreelancerDashboard() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      const fetchMyProposals = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/proposals/freelancer/${user.id}`);
          setProposals(response.data);
        } catch (err) {
          setError('Falha ao carregar suas propostas.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchMyProposals();
    }
  }, [user]);

  return (
    <Container my="md">
      <Title order={2} mb="lg">Minhas Propostas</Title>

      {loading && <Group justify="center"><Loader /></Group>}
      {error && <Text c="red" ta="center">{error}</Text>}

      <Grid>
        {!loading && proposals.length === 0 && (
            <Container p="md">
                <Text>Você ainda não enviou nenhuma proposta.</Text>
            </Container>
        )}
        {!loading && proposals.map((proposal) => (
          <Grid.Col span={{ base: 12, md: 6 }} key={proposal.id}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Title order={4}>{proposal.project_titulo}</Title>
                <Badge>{proposal.status}</Badge>
              </Group>
              <Text size="sm" fw={500} c="dimmed">Valor: R$ {parseFloat(proposal.valor).toLocaleString('pt-BR')}</Text>
              <Text size="sm" c="dimmed" lineClamp={2} mt="sm" mb="lg">
                {proposal.descricao}
              </Text>
              <Button component={Link} to={`/projects/${proposal.project_id}`} variant="light" fullWidth>
                Ver Proposta / Projeto
              </Button>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
    </Container>
  );
}
