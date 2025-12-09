import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Container, Grid, Card, Title, Text, Badge, Button, Group, Loader } from '@mantine/core';

// Definir a interface do Projeto para corresponder aos dados do backend
interface Project {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
}

export default function PublicHome() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await api.get('/projects');
        setProjects(response.data);
      } catch (err) {
        setError('Falha ao carregar projetos.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <Container my="xl">
      <Title order={1} mb="lg" ta="center">Projetos Abertos</Title>
      
      {loading && <Group justify="center"><Loader /></Group>}
      {error && <Text c="red" ta="center">{error}</Text>}

      <Grid>
        {!loading && !error && projects.map((project) => (
          <Grid.Col span={{ base: 12, md: 6, lg: 4 }} key={project.id}>
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ height: '100%' }}>
              <Group justify="space-between" mb="xs">
                <Title order={3}>{project.titulo}</Title>
                <Badge color={project.status === 'aberto' ? 'green' : 'blue'}>{project.status}</Badge>
              </Group>

              <Text size="sm" c="dimmed" lineClamp={4} mt="sm" mb="lg">
                {project.descricao}
              </Text>

              <Button component={Link} to={`/projects/${project.id}`} variant="light" color="blue" fullWidth mt="md" radius="md">
                Ver Detalhes e Enviar Proposta
              </Button>
            </Card>
          </Grid.Col>
        ))}
        {!loading && projects.length === 0 && (
          <Container p="md">
            <Text ta="center">Nenhum projeto aberto encontrado no momento.</Text>
          </Container>
        )}
      </Grid>
    </Container>
  );
}
