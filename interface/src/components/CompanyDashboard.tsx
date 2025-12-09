import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Title, Text, Button, Card, Grid, Badge, Group, Loader } from '@mantine/core';
import { Plus } from 'lucide-react';
import api from '../services/api';

interface Project {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  criado_em: string;
}

export default function CompanyDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMyProjects = async () => {
      try {
        setLoading(true);
        const response = await api.get('/projects/my');
        setProjects(response.data);
      } catch (err) {
        setError('Falha ao carregar seus projetos.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyProjects();
  }, []);

  return (
    <Container my="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Meus Projetos</Title>
        <Button component={Link} to="/company/project/new" leftSection={<Plus size={18} />}>
          Criar Novo Projeto
        </Button>
      </Group>

      {loading && <Group justify="center"><Loader /></Group>}
      {error && <Text c="red" ta="center">{error}</Text>}
      
      <Grid>
        {!loading && projects.length === 0 && (
            <Container p="md">
                <Text>Você ainda não criou nenhum projeto.</Text>
            </Container>
        )}
        {!loading && projects.map((project) => (
          <Grid.Col span={{ base: 12, md: 6 }} key={project.id}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Title order={4}>{project.titulo}</Title>
                <Badge>{project.status}</Badge>
              </Group>
              <Text size="sm" c="dimmed" lineClamp={2} mt="sm" mb="lg">
                {project.descricao}
              </Text>
              <Button component={Link} to={`/company/project/${project.id}`} variant="light" fullWidth>
                Gerenciar Projeto
              </Button>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
    </Container>
  );
}
