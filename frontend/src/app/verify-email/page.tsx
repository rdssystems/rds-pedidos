'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ChefHat } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token de verificação ausente.');
            return;
        }

        const verify = async () => {
            try {
                const response = await fetch('/api/users/confirm-verification/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();
                if (response.ok) {
                    setStatus('success');
                    setMessage(data.message);
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Erro ao verificar e-mail.');
                }
            } catch (err) {
                setStatus('error');
                setMessage('Erro ao conectar com o servidor.');
            }
        };

        verify();
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>

            <div className="z-10 w-full max-w-md p-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl text-center">
                    {status === 'loading' && (
                        <div className="space-y-6">
                            <Loader2 className="animate-spin text-primary mx-auto" size={48} />
                            <h2 className="text-2xl font-black text-white uppercase italic">Verificando...</h2>
                            <p className="text-gray-400">Estamos validando seu e-mail, aguarde um momento.</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="space-y-6 animate-slide-up">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="text-green-500" size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase italic">E-mail Verificado!</h2>
                            <p className="text-gray-400">{message}</p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary/80 transition-all"
                            >
                                Ir para o Login
                                <ChefHat size={18} />
                            </Link>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-6 animate-slide-up">
                            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                                <XCircle className="text-red-500" size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase italic">Ops! Algo deu errado</h2>
                            <p className="text-gray-400">{message}</p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10"
                            >
                                Voltar para o Login
                            </Link>
                        </div>
                    )}

                    <div className="mt-12 pt-8 border-t border-white/5 text-center">
                        <p className="text-gray-500 text-xs text-opacity-40 uppercase tracking-widest font-bold">
                            rDs Systems © 2025
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
                <Loader2 className="animate-spin text-white" size={32} />
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
