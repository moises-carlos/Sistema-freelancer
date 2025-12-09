import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell, Group, Button, Burger, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuth } from '../context/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [opened, { toggle }] = useDisclosure();
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Text size="xl" fw={700}>FreelanceHub</Text>
          {isAuthenticated ? (
            <Group>
              <Text size="sm">Olá, {user?.tipo}</Text>
              <Button onClick={handleLogout} variant="outline" size="sm">Sair</Button>
            </Group>
          ) : (
            <Group>
              <Button component={Link} to="/login" size="sm">Login</Button>
              <Button component={Link} to="/register" variant="outline" size="sm">Registrar</Button>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      {/* Navbar visível apenas para usuários autenticados */}
      {isAuthenticated && (
        <AppShell.Navbar p="md">
          <AppShell.Section grow>
            <Text fw={500} size="lg" mb="md">Navegação</Text>
            {user?.tipo === 'empresa' && (
              <>
                <Button component={Link} to="/company/dashboard" variant="subtle" fullWidth mt="sm">Meus Projetos</Button>
                <Button component={Link} to="/company/project/new" variant="subtle" fullWidth mt="xs">Criar Projeto</Button>
              </>
            )}
            {user?.tipo === 'freelancer' && (
              <>
                <Button component={Link} to="/freelancer/dashboard" variant="subtle" fullWidth mt="sm">Minhas Propostas</Button>
                <Button component={Link} to="/projects" variant="subtle" fullWidth mt="xs">Buscar Projetos</Button>
              </>
            )}
            {user?.tipo === 'admin' && (
              <Button component={Link} to="/admin/dashboard" variant="subtle" fullWidth mt="sm">Admin Dashboard</Button>
            )}
          </AppShell.Section>

          <AppShell.Section>
            <Button onClick={handleLogout} variant="light" fullWidth mt="md">Sair</Button>
          </AppShell.Section>
        </AppShell.Navbar>
      )}

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}