import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Title, TextInput, Textarea, Button, Group, Loader, Paper } from '@mantine/core';
import { useForm } from '@mantine/form';
import api from '../services/api';
import { notifications } from '@mantine/notifications';

export default function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [loading, setLoading] = useState(isEditing);

  const form = useForm({
    initialValues: {
      titulo: '',
      descricao: '',
    },
    validate: {
      titulo: (value) => (value.length < 5 ? 'Título deve ter no mínimo 5 caracteres' : null),
      descricao: (value) => (value.length < 20 ? 'Descrição deve ter no mínimo 20 caracteres' : null),
    },
  });

  useEffect(() => {
    if (isEditing) {
      api.get(`/projects/${id}`)
        .then(response => {
          form.setValues(response.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          notifications.show({
            title: 'Erro',
            message: 'Falha ao carregar dados do projeto para edição.',
            color: 'red',
          });
          setLoading(false);
        });
    }
  }, [id, isEditing]); // form.setValues foi removido do array de dependências para evitar re-execução desnecessária

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      if (isEditing) {
        await api.put(`/projects/${id}`, values);
      } else {
        await api.post('/projects', values);
      }
      notifications.show({
        title: 'Sucesso!',
        message: `Projeto ${isEditing ? 'atualizado' : 'criado'} com sucesso.`,
        color: 'green',
      });
      navigate('/company/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || `Falha ao ${isEditing ? 'atualizar' : 'criar'} projeto.`;
      notifications.show({
        title: 'Erro',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container my="md">
      <Title order={2} mb="lg">{isEditing ? 'Editar Projeto' : 'Criar Novo Projeto'}</Title>
      <Paper withBorder shadow="md" p={30} radius="md">
        {loading && isEditing ? (
          <Group justify="center"><Loader /></Group>
        ) : (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <TextInput
              label="Título do Projeto"
              placeholder="Ex: Desenvolvimento de website institucional"
              required
              {...form.getInputProps('titulo')}
            />
            <Textarea
              label="Descrição Detalhada do Projeto"
              placeholder="Descreva em detalhes o que você precisa..."
              required
              mt="md"
              minRows={5}
              autosize
              {...form.getInputProps('descricao')}
            />
            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={() => navigate('/company/dashboard')}>Cancelar</Button>
              <Button type="submit" loading={loading}>{isEditing ? 'Salvar Alterações' : 'Criar Projeto'}</Button>
            </Group>
          </form>
        )}
      </Paper>
    </Container>
  );
}
