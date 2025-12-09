import React from 'react';
import { Container } from '@mantine/core';

// Este componente pode ser expandido para ter um layout de dashboard mais complexo.
// Por agora, ele serve como um simples container para o conteúdo das páginas de dashboard.
// O layout principal com navbar e header já está no AppLayout.tsx.
const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Container fluid>
      {children}
    </Container>
  );
};

export default DashboardLayout;
