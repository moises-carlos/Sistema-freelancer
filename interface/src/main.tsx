import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';

// Mantine Imports
import '@mantine/core/styles.css';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';

// Crie seu tema Mantine (opcional)
const theme = createTheme({
  /** Put your mantine theme override here */
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router> {/* BrowserRouter deve ser o primeiro para envolver as rotas */}
      <AuthProvider>
        <MantineProvider theme={theme}>
          <Notifications /> {/* Componente de notificações */}
          <ModalsProvider> {/* Provedor de modais */}
            <App />
          </ModalsProvider>
        </MantineProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);