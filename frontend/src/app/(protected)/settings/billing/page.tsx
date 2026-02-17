'use client';

import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    Check,
    Zap,
    ShieldCheck,
    Clock,
    AlertCircle,
    ArrowRight,
    CheckCircle2
} from 'lucide-react';

interface Plano {
    id: number;
    nome: string;
    preco_mensal: string;
    description: string;
    max_produtos: number;
    recursos: Record<string, boolean>;
}

interface Store {
    id: number;
    nome: string;
    status_assinatura: string;
    valido_ate: string | null;
    plano_details: Plano | null;
}

export default function BillingPage() {
    const [store, setStore] = useState<Store | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const response = await fetch('/api/lojas/');
                const data = await response.json();
                const s = Array.isArray(data) ? data[0] : (data.results ? data.results[0] : data);
                if (s) {
                    setStore(s);
                }
            } catch (error) {
                console.error('Error fetching store info:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, []);

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'active':
                return { label: 'Ativa', color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle2 };
            case 'trial':
                return { label: 'Período de Teste', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Clock };
            case 'expired':
                return { label: 'Expirada', color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle };
            default:
                return { label: 'Inativa', color: 'text-gray-500', bg: 'bg-gray-500/10', icon: ShieldCheck };
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const status = getStatusInfo(store?.status_assinatura || 'inactive');
    const StatusIcon = status.icon;

    const plans = [
        {
            name: 'Gratuito',
            price: '0,00',
            description: 'Ideal para quem está começando agora.',
            features: ['Até 10 produtos', 'Pedidos via WhatsApp', 'Painel Básico'],
            current: !store?.plano_details || store.plano_details.nome === 'Gratuito'
        },
        {
            name: 'Pro',
            price: '49,90',
            description: 'Para negócios em crescimento que precisam de escala.',
            features: ['Produtos Ilimitados', 'Painel Kanban', 'Relatórios Avançados', 'Multi-usuário'],
            recommended: true,
            current: store?.plano_details?.nome === 'Pro'
        },
        {
            name: 'Premium',
            price: '99,90',
            description: 'O controle total do seu negócio com IA.',
            features: ['Tudo do Pro', 'IA Anti-Fraude', 'Insights de Vendas', 'Prioridade no Suporte'],
            current: store?.plano_details?.nome === 'Premium'
        }
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            <header>
                <h1 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter">Assinatura e Planos</h1>
                <p className="text-gray-500 mt-1">Gerencie seu plano e veja detalhes do seu faturamento</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Current Plan Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                            <CreditCard className="text-primary" />
                            <h2 className="text-xl font-bold text-gray-900 uppercase italic tracking-tight">Status Atual</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Plano</span>
                                <span className="text-gray-900 font-black italic uppercase">{store?.plano_details?.nome || 'Trial / Grátis'}</span>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Status</span>
                                <div className={`flex items-center gap-2 ${status.color} ${status.bg} px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest`}>
                                    <StatusIcon size={14} />
                                    <span>{status.label}</span>
                                </div>
                            </div>

                            {store?.valido_ate && (
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                    <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Vence em</span>
                                    <span className="text-gray-900 font-bold">{new Date(store.valido_ate).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>

                        <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all">
                            Ver Histórico de Pagamentos
                        </button>
                    </div>

                    <div className="bg-gradient-to-tr from-primary to-purple-600 rounded-3xl p-8 text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
                        <Zap className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-700" />
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Precisa de Ajuda?</h3>
                        <p className="text-white/80 text-sm mb-6">Upgrade de plano, dúvidas sobre cobrança ou suporte técnico especializado.</p>
                        <button className="bg-white text-primary px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:shadow-lg transition-all">
                            Falar com Consultor <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Plan Options */}
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map((plan, idx) => (
                            <div
                                key={idx}
                                className={`bg-white rounded-3xl p-8 shadow-sm border transition-all flex flex-col h-full ${plan.recommended ? 'border-primary ring-1 ring-primary shadow-primary/5 relative' : 'border-gray-100'
                                    }`}
                            >
                                {plan.recommended && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg shadow-primary/20">
                                        Recomendado
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h4 className="text-2xl font-black italic uppercase text-gray-900 leading-none">{plan.name}</h4>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-gray-500 text-sm font-bold uppercase">R$</span>
                                        <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                                        <span className="text-gray-400 text-xs font-bold">/mês</span>
                                    </div>
                                    <p className="mt-4 text-gray-500 text-sm font-medium">{plan.description}</p>
                                </div>

                                <ul className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature, fidx) => (
                                        <li key={fidx} className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                                            <div className="w-5 h-5 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    disabled={plan.current}
                                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${plan.current
                                            ? 'bg-gray-100 text-gray-400 cursor-default'
                                            : plan.recommended
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40'
                                                : 'bg-white border-2 border-gray-100 text-gray-900 hover:border-primary hover:text-primary'
                                        }`}
                                >
                                    {plan.current ? 'Seu Plano Atual' : 'Upgrade Agora'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
