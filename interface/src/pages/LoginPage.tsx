import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Container, Title, TextInput, PasswordInput, Button, Group, Text, Anchor, Paper } from '@mantine/core';
import { Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, senha: password });
      if (response.data.token) {
        login(response.data.token);
        notifications.show({
          title: 'Sucesso!',
          message: 'Login realizado com sucesso.',
          color: 'green',
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Falha no login. Tente novamente.';
      notifications.show({
        title: 'Erro no Login',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Bem-vindo(a) de volta!</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Não tem uma conta? <Anchor component={Link} to="/register" size="sm">Crie uma</Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            placeholder="seu@email.com"
            required
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
          <PasswordInput
            label="Senha"
            placeholder="Sua senha"
            required
            mt="md"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
          <Button fullWidth mt="xl" type="submit" loading={loading}>
            Login
          </Button>
          <Button fullWidth mt="md" variant="default" onClick={handleGoogleLogin} loading={loading}>
            Login com Google
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default LoginPage;
