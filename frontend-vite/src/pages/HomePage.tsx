import React from 'react';
import { Navigate } from 'react-router-dom';

export default function HomePage() {
    // Se o usuário cair na raiz do app React, redirecionamos para o login
    // Geralmente a landing page principal fica em outro domínio/pasta
    return <Navigate to="/login" replace />;
}
