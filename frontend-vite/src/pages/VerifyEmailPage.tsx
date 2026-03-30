import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

export default function VerifyEmailPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verificando seu e-mail...');

    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const token = query.get('token');

        if (!token) {
            setStatus('error');
            setMessage('Link de verificação inválido ou incompleto.');
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await fetch('/api/users/confirm-verification/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                const data = await response.json();

                if (response.ok) {
                    setStatus('success');
                    setMessage('E-mail verificado com sucesso! Você já pode acessar sua conta.');
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Não foi possível verificar seu e-mail. O link pode ter expirado.');
                }
            } catch (error) {
                console.error('Error verifying email:', error);
                setStatus('error');
                setMessage('Ocorreu um erro ao conectar com o servidor.');
            }
        };

        verifyEmail();
    }, [location]);

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_#ff7d050a_0%,_transparent_40%),_radial-gradient(circle_at_bottom_left,_#ff7d050a_0%,_transparent_40%)]">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-orange-900/5 p-10 border border-gray-100 text-center relative overflow-hidden">
                {/* Background Detail */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 to-orange-600"></div>

                <div className="flex flex-col items-center">
                    {status === 'loading' && (
                        <>
                            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                            </div>
                            <h1 className="text-2xl font-black text-gray-900 italic uppercase tracking-tighter mb-4">Verificando...</h1>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                            <h1 className="text-2xl font-black text-gray-900 italic uppercase tracking-tighter mb-4">Sucesso!</h1>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                                <XCircle className="w-10 h-10 text-red-500" />
                            </div>
                            <h1 className="text-2xl font-black text-gray-900 italic uppercase tracking-tighter mb-4">Ops! Algo deu errado</h1>
                        </>
                    )}

                    <p className="text-gray-500 font-medium leading-relaxed mb-8">
                        {message}
                    </p>

                    {status !== 'loading' && (
                        <Link
                            to="/login"
                            className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 transition-all shadow-lg shadow-orange-500/25 active:scale-95 group"
                        >
                            Ir para o Login
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
