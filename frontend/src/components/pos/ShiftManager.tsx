'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePos } from '@/context/PosContext';
import { useAuth } from '@/context/AuthContext';
import { Lock, Unlock, AlertTriangle, ChevronLeft, X } from 'lucide-react';

export const ShiftManager = () => {
    const { user } = useAuth();
    const { caixa, isLoading, abrirCaixa, fecharCaixa } = usePos();
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

    // Get active store ID from localStorage
    const activeStoreId = typeof window !== 'undefined' ? localStorage.getItem('activeStoreId') : null;

    // Check if current user is owner of the active store
    const isOwner = user?.roles.some(r => String(r.id) === activeStoreId && r.role === 'owner');

    const handleBack = () => {
        router.push('/dashboard');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const val = parseFloat(amount.replace(',', '.'));
            if (isNaN(val)) throw new Error("Valor inválido");

            if (caixa) {
                await fecharCaixa(val);
                setAmount('');
                setIsCloseModalOpen(false);
            } else {
                await abrirCaixa(val);
                setAmount('');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="animate-pulse bg-gray-200 h-10 w-32 rounded"></div>;

    if (!caixa) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-slide-up relative">
                    <button
                        onClick={handleBack}
                        className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        type="button"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <Lock size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Caixa Fechado</h2>
                        <p className="text-gray-500 mt-2">Informe o fundo de troco para iniciar as vendas.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Saldo Inicial (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full text-3xl font-black text-center border-b-2 border-gray-200 focus:border-primary outline-none py-2 bg-transparent"
                                placeholder="0,00"
                                autoFocus
                            />
                        </div>

                        {error && <div className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded">{error}</div>}

                        <button
                            disabled={isSubmitting || !amount}
                            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Abrindo...' : 'ABRIR CAIXA'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg flex items-center gap-3 font-bold text-sm shadow-sm border border-green-200">
                <Unlock size={16} />
                <span>Caixa Aberto: #{caixa.id}</span>
                <span className="text-green-600 text-xs">Desde {new Date(caixa.data_abertura || '').toLocaleTimeString()}</span>
            </div>

            {isOwner && (
                <button
                    onClick={() => setIsCloseModalOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-500/20"
                >
                    <Lock size={16} />
                    FECHAR CAIXA
                </button>
            )}

            {isCloseModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-slide-up relative">
                        <button
                            onClick={() => setIsCloseModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={24} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                <AlertTriangle size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Fechar Caixa</h2>
                            <p className="text-gray-500 mt-2">Confirme o saldo final em dinheiro para encerrar o turno.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Saldo Final Informado (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full text-3xl font-black text-center border-b-2 border-gray-200 focus:border-primary outline-none py-2 bg-transparent"
                                    placeholder="0,00"
                                    autoFocus
                                />
                            </div>

                            {error && <div className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded">{error}</div>}

                            <button
                                disabled={isSubmitting || !amount}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Fechando...' : 'CONFIRMAR FECHAMENTO'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
