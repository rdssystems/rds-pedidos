import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePos } from '../../context/PosContext';
import { useAuth } from '../../context/AuthContext';
import { Lock, Unlock, AlertTriangle, ChevronLeft, X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export const ShiftManager = () => {
    const { user } = useAuth();
    const { caixa, isLoading, abrirCaixa, fecharCaixa } = usePos();
    const navigate = useNavigate();
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

    // Sangria/Suprimento states
    const [isSangriaModalOpen, setIsSangriaModalOpen] = useState(false);
    const [isSuprimentoModalOpen, setIsSuprimentoModalOpen] = useState(false);
    const [movDescricao, setMovDescricao] = useState('');
    const { registrarSangria, registrarSuprimento } = usePos();

    // Get active store ID from localStorage
    const activeStoreId = typeof window !== 'undefined' ? localStorage.getItem('activeStoreId') : null;

    // Check if current user is owner of the active store
    const isOwner = user?.roles.some((r: any) => String(r.id) === activeStoreId && r.role === 'owner');

    const handleBack = () => {
        navigate('/dashboard');
    };

    // Sugerir o saldo atual ao abrir o modal de fechamento
    useEffect(() => {
        if (isCloseModalOpen && caixa) {
            setAmount(String(caixa.saldo_atual || 0));
        }
    }, [isCloseModalOpen, caixa]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const val = parseFloat(amount.replace(',', '.'));
            if (isNaN(val)) throw new Error("Valor inválido");

            if (caixa) {
                if (isCloseModalOpen) {
                    await fecharCaixa(val);
                    setIsCloseModalOpen(false);
                } else if (isSangriaModalOpen) {
                    await registrarSangria(val, movDescricao || 'Sangria de Caixa');
                    setIsSangriaModalOpen(false);
                } else if (isSuprimentoModalOpen) {
                    await registrarSuprimento(val, movDescricao || 'Suprimento de Caixa');
                    setIsSuprimentoModalOpen(false);
                }
                setAmount('');
                setMovDescricao('');
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
        <div className="flex flex-wrap items-center gap-1 lg:gap-2 justify-end">
            <div className="bg-green-50 text-green-800 px-2 lg:px-3 py-1.5 rounded-lg flex items-center gap-2 lg:gap-3 font-bold text-[10px] lg:text-xs shadow-sm border border-green-200 shrink-0">
                <div className="flex items-center gap-1 border-r border-green-200 pr-2 lg:pr-3">
                    <Unlock size={12} className="text-green-600" />
                    <span className="whitespace-nowrap"># {caixa.id}</span>
                </div>
                <div className="flex items-center gap-1.5 font-black">
                    <span className="text-green-600 text-xs lg:text-sm">R$ {parseFloat(String(caixa.saldo_atual || 0)).toFixed(2)}</span>
                </div>
            </div>

            {isOwner && (
                <div className="flex items-center gap-1 lg:gap-2">
                    <button
                        onClick={() => setIsSuprimentoModalOpen(true)}
                        title="Suprimento de Caixa"
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 lg:px-3 lg:py-1.5 rounded-lg font-black text-[10px] lg:text-xs flex items-center gap-1 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                    >
                        <ArrowUpCircle size={14} /> <span className="hidden sm:inline lg:inline">Suprimento</span>
                    </button>
                    <button
                        onClick={() => setIsSangriaModalOpen(true)}
                        title="Sangria de Caixa"
                        className="bg-orange-600 hover:bg-orange-700 text-white p-2 lg:px-3 lg:py-1.5 rounded-lg font-black text-[10px] lg:text-xs flex items-center gap-1 transition-all active:scale-95 shadow-lg shadow-orange-500/20"
                    >
                        <ArrowDownCircle size={14} /> <span className="hidden sm:inline lg:inline">Sangria</span>
                    </button>
                    <button
                        onClick={() => setIsCloseModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 lg:px-3 lg:py-1.5 rounded-lg font-black text-[10px] lg:text-xs flex items-center gap-1 transition-all active:scale-95 shadow-lg shadow-red-500/20"
                        title="Fechar Caixa"
                    >
                        <Lock size={14} /> <span className="hidden sm:inline lg:inline">FECHAR</span>
                    </button>
                </div>
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

            {/* Sangria/Suprimento modals omitidos para brevidade se não necessários, mas mantidos para fidelidade */}
            {isSangriaModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-slide-up relative">
                        <button onClick={() => setIsSangriaModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                                <ArrowDownCircle size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Sangria</h2>
                            <p className="text-gray-500 mt-2">Retirada de dinheiro do caixa.</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full text-3xl font-black text-center border-b-2 border-gray-200' focus:border-primary outline-none py-2 bg-transparent" placeholder="0,00" autoFocus required />
                            <input type="text" value={movDescricao} onChange={e => setMovDescricao(e.target.value)} className="w-full text-lg border-b-2 border-gray-200 focus:border-primary outline-none py-2 bg-transparent" placeholder="Descrição" required />
                            {error && <div className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded">{error}</div>}
                            <button disabled={isSubmitting || !amount || !movDescricao} className="w-full py-4 bg-orange-600 text-white font-black uppercase rounded-xl">REGISTRAR SANGRIA</button>
                        </form>
                    </div>
                </div>
            )}

            {isSuprimentoModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-slide-up relative">
                        <button onClick={() => setIsSuprimentoModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                                <ArrowUpCircle size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Suprimento</h2>
                            <p className="text-gray-500 mt-2">Entrada de dinheiro extra no caixa.</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full text-3xl font-black text-center border-b-2 border-gray-200 focus:border-primary outline-none py-2 bg-transparent" placeholder="0,00" autoFocus required />
                            <input type="text" value={movDescricao} onChange={e => setMovDescricao(e.target.value)} className="w-full text-lg border-b-2 border-gray-200 focus:border-primary outline-none py-2 bg-transparent" placeholder="Descrição" required />
                            {error && <div className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded">{error}</div>}
                            <button disabled={isSubmitting || !amount || !movDescricao} className="w-full py-4 bg-blue-600 text-white font-black uppercase rounded-xl">REGISTRAR SUPRIMENTO</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
