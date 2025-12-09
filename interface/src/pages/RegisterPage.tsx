import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Container, Title, TextInput, PasswordInput, Button, Group, Text, Anchor, Paper, Radio } from '@mantine/core';
import { Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';

type UserType = 'empresa' | 'freelancer';

const RegisterPage: React.FC = () => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tipo, setTipo] = useState<UserType>('freelancer');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/register', { nome, email, senha: password, tipo });
      if (response.data.token) {
        login(response.data.token);
        notifications.show({
          title: 'Sucesso!',
          message: 'Registro realizado com sucesso.',
          color: 'green',
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Falha no registro. Tente novamente.';
      notifications.show({
        title: 'Erro no Registro',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Crie sua conta</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Já tem uma conta? <Anchor component={Link} to="/login" size="sm">Faça login</Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Nome Completo"
            placeholder="Seu nome"
            required
            value={nome}
            onChange={(event) => setNome(event.currentTarget.value)}
          />
          <TextInput
            label="Email"
            placeholder="seu@email.com"
            required
            mt="md"
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
          <Radio.Group
            label="Tipo de Conta"
            description="Escolha se você é uma empresa ou um freelancer"
            value={tipo}
            onChange={(value) => setTipo(value as UserType)}
            required
            mt="md"
          >
            <Group mt="xs">
              <Radio value="empresa" label="Empresa" />
              <Radio value="freelancer" label="Freelancer" />
            </Group>
          </Radio.Group>
          <Button fullWidth mt="xl" type="submit" loading={loading}>
            Registrar
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default RegisterPage;
