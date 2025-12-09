import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Importar os componentes de página reais
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PublicHome from './components/PublicHome'; // Sua página pública original
import CompanyDashboard from './components/CompanyDashboard'; // Seu dashboard de empresa original
import FreelancerDashboard from './components/FreelancerDashboard'; // Seu dashboard de freelancer original
import ProjectDetails from './components/ProjectDetails'; // Seus detalhes de projeto originais
import ProjectForm from './components/ProjectForm'; // Seu formulário de projeto original
import AppLayout from './components/AppLayout'; // Novo componente de layout

// Componente para lidar com o callback do Google
const GoogleAuthCallback = () => {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      login(token);
    }
    navigate('/'); // Redireciona para a home após tentar logar
  }, [login, searchParams, navigate]);

  return <div>Autenticando...</div>;
};

function App() {
  const { user, isAuthenticated } = useAuth();
  
  return (
    <AppLayout> {/* Nosso layout global */}
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={isAuthenticated ? <Navigate to={user?.tipo === 'empresa' ? '/company/dashboard' : '/freelancer/dashboard'} /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to={user?.tipo === 'empresa' ? '/company/dashboard' : '/freelancer/dashboard'} /> : <RegisterPage />} />
        <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
        
        {/* Rota Inicial - redireciona se autenticado */}
        <Route
          path="/"
          element={isAuthenticated ? (
            <Navigate to={user?.tipo === 'empresa' ? '/company/dashboard' : '/freelancer/dashboard'} />
          ) : (
            <PublicHome />
          )}
        />

        {/* Rota pública para ver detalhes de um projeto (usada no botão "Ver Detalhes e Enviar Proposta") */}
        <Route path="/projects/:id" element={<ProjectDetails />} />
        
        {/* Rotas Autenticadas (Protegidas) */}
        {isAuthenticated && user?.tipo === 'empresa' && (
          <>
            <Route path="/company/dashboard" element={<CompanyDashboard />} />
            <Route path="/company/project/new" element={<ProjectForm />} />
            <Route path="/company/project/:id" element={<ProjectDetails />} />
            <Route path="/company/project/:id/edit" element={<ProjectForm />} />
          </>
        )}
        {isAuthenticated && user?.tipo === 'freelancer' && (
          <>
            <Route path="/freelancer/dashboard" element={<FreelancerDashboard />} />
            <Route path="/freelancer/project/:id" element={<ProjectDetails />} />
            <Route path="/projects" element={<PublicHome />} /> {/* Freelancer pode buscar projetos */}
          </>
        )}
        {isAuthenticated && user?.tipo === 'admin' && (
          <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} /> // Placeholder simples para admin
        )}

        {/* Rota de Fallback - para rotas não encontradas ou não autorizadas */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
