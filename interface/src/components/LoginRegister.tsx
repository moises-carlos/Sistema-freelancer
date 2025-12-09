import React from 'react';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import { useLocation } from 'react-router-dom';

/**
 * Este componente atuava como um switcher entre Login e Registro.
 * Como agora temos rotas separadas (/login, /register) que renderizam
 * as páginas diretamente, este componente não é estritamente necessário
 * para a lógica de roteamento, mas o mantemos para satisfazer a importação
 * no App.tsx. Em uma refatoração futura, poderíamos remover este componente
 * e usar as páginas diretamente nas rotas.
 */
const LoginRegister: React.FC = () => {
    const location = useLocation();

    // Simplesmente renderiza a página correta com base na rota
    return (
        <>
            {location.pathname.includes('/login') && <LoginPage />}
            {location.pathname.includes('/register') && <RegisterPage />}
        </>
    );
};

export default LoginRegister;
