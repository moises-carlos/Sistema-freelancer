import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api'; // Import our API client

// Corrigindo a interface para corresponder ao que o backend envia no token
export interface User {
  id: number;
  tipo: 'empresa' | 'freelancer' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Effect para carregar o token do localStorage na inicialização e configurar o axios
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        const decodedUser: User = jwtDecode(storedToken);
        // Opcional: Verificar se o token não expirou
        // const expiration = (decodedUser as any).exp;
        // if (Date.now() >= expiration * 1000) {
        //   throw new Error("Token expired");
        // }
        setUser(decodedUser);
        setToken(storedToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`; // Configura o axios
      }
    } catch (error) {
      console.error("Token inválido ou expirado no carregamento inicial:", error);
      localStorage.removeItem('authToken');
      // Reseta axios header se houver erro
      delete api.defaults.headers.common['Authorization'];
    }
  }, []);

  const login = (newToken: string) => {
    try {
      const decodedUser: User = jwtDecode(newToken);
      localStorage.setItem('authToken', newToken);
      setUser(decodedUser);
      setToken(newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`; // Configura o axios
    } catch (error) {
      console.error("Falha ao decodificar token no login:", error);
      // Garante que o estado não fique inconsistente
      logout();
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setToken(null);
    delete api.defaults.headers.common['Authorization']; // Limpa o header do axios
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
