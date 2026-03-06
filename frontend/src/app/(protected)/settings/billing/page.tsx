'use client';

import React, { useState } from 'react';
import {
    Check,
    Zap,
    Crown,
    Rocket,
    ShieldCheck,
    Star,
    ArrowRight,
    ShoppingBag,
    MessageCircle,
    BarChart3,
    Layers
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBilling } from '@/context/BillingContext';

const plans = [
    {
        id: 'start',
        name: 'Start',
        price: '49,90',
        description: 'Ideal para quem está começando a organizar sua operação.',
        icon: <Rocket className="text-blue-500" size={24} />,
        color: 'blue',
        features: [
            'Gestão de Pedidos (Kanban)',
            'Mesas e Comandas',
            'Cardápio Digital QR Code',
            'Cadastro de Produtos Ilimitado',
            '1 Usuário Logado',
            'Suporte via E-mail'
        ],
        notIncluded: [
            'Integração iFood',
            'WhatsApp Bot',
            'Gestão de Estoque',
            'Multi-lojas'
        ],
        buttonText: 'Começar Agora',
        badge: 'O Essencial'
    },
    {
        id: 'pro',
        name: 'Pro',
        price: '129,90',
        description: 'O plano perfeito para restaurantes que buscam automação real.',
        icon: <Zap className="text-red-500" size={24} />,
        color: 'red',
        popular: true,
        features: [
            'Tudo do Plano Start',
            'Integração iFood Oficial',
            'WhatsApp Bot (Automação)',
            'Relatórios de Vendas',
            'Até 5 Usuários Logados',
            'Suporte Prioritário WhatsApp'
        ],
        notIncluded: [
            'Gestão de Estoque Avançada',
            'Módulo Multi-lojas'
        ],
        buttonText: 'Assinar Pro',
        badge: 'Mais Vendido'
    },
    {
        id: 'elite',
        name: 'Elite',
        price: '199,90',
        description: 'Potência total para grandes redes e franquias.',
        icon: <Crown className="text-amber-500" size={24} />,
        color: 'amber',
        features: [
            'Tudo do Plano Pro',
            'Módulo Multi-lojas',
            'Gestão de Estoque Avançada',
            'Dashboard de BI (Analytics)',
            'Usuários Ilimitados',
            'Gerente de Conta Exclusivo'
        ],
        notIncluded: [],
        buttonText: 'Seja Elite',
        badge: 'Completo'
    }
];

export default function PlansPage() {
    const { user } = useAuth();
    const { store: activeStore } = useBilling();
    const [loading, setLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubscription = async (planId: string) => {
        setLoading(planId);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            const slug = activeStore?.slug;

            if (!slug) {
                setMessage({ type: 'error', text: 'Você precisa ter uma loja cadastrada para assinar um plano.' });
                setLoading(null);
                return;
            }

            const response = await fetch(`/api/lojas/${slug}/mp-create-subscription/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ plan_type: planId.toUpperCase() })
            });

            const data = await response.json();

            if (response.ok && data.init_point) {
                // Redireciona o usuário para o Checkout do Mercado Pago
                window.location.href = data.init_point;
            } else {
                setMessage({ type: 'error', text: data.error || 'Erro ao gerar assinatura.' });
            }
        } catch (err) {
            console.error('Error starting subscription:', err);
            setMessage({ type: 'error', text: 'Erro de conexão com o servidor.' });
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
            {message && (
                <div className={`p-4 rounded-2xl text-sm font-bold italic fixed top-5 right-5 z-50 animate-bounce shadow-2xl ${message.type === 'success' ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-red-100 text-red-600 border border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            <header className="text-center space-y-3 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-black uppercase tracking-widest italic border border-red-100">
                    <Star size={14} fill="currentColor" /> Escolha o seu plano
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 italic uppercase tracking-tighter leading-tight">
                    Eleve o nível do seu <span className="text-red-600">Restaurante</span>
                </h1>
                <p className="text-base text-gray-500 font-medium italic">
                    Sem taxas de adesão. Sem contratos de fidelidade. Cancele quando quiser.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`relative bg-white rounded-3xl p-6 flex flex-col transition-all duration-500 ${plan.popular
                            ? 'ring-2 ring-red-600 ring-offset-2 shadow-2xl shadow-red-600/20 md:scale-105 z-10'
                            : 'border border-gray-100 shadow-xl shadow-gray-200/50 hover:-translate-y-1'
                            }`}
                    >
                        {plan.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/40">
                                ⭐ Mais Popular
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-5">
                            <div className={`p-3 rounded-2xl bg-${plan.color}-50`}>
                                {plan.icon}
                            </div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                                {plan.badge}
                            </span>
                        </div>

                        <div className="mb-5">
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900 mb-1">{plan.name}</h2>
                            <p className="text-xs text-gray-500 font-medium italic leading-relaxed">{plan.description}</p>
                        </div>

                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-sm font-black text-gray-900 italic">R$</span>
                            <span className="text-4xl md:text-5xl font-black text-gray-900 italic tracking-tighter">{plan.price}</span>
                            <span className="text-gray-400 font-black italic uppercase text-[10px]">/mês</span>
                        </div>

                        <div className="space-y-3 flex-1 mb-6 border-t border-gray-50 pt-5">
                            {plan.features.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                        <Check size={10} strokeWidth={4} />
                                    </div>
                                    <span className="text-xs font-bold italic text-gray-700">{feature}</span>
                                </div>
                            ))}
                            {plan.notIncluded.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2 opacity-30">
                                    <div className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                                        <Check size={10} strokeWidth={4} />
                                    </div>
                                    <span className="text-xs font-bold italic text-gray-400 line-through">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => handleSubscription(plan.id)}
                            disabled={!!loading}
                            className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 mt-auto ${plan.popular
                                ? 'bg-red-600 text-white shadow-red-600/20 hover:shadow-red-600/40 hover:bg-red-700'
                                : 'bg-gray-900 text-white shadow-gray-900/20 hover:shadow-gray-900/40 hover:bg-black'
                                }`}
                        >
                            {loading === plan.id ? (
                                <div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    {plan.buttonText}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            <footer className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-20 border-t border-gray-100">
                <div className="flex flex-col items-center text-center gap-3 p-6 group">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 group-hover:bg-red-50 group-hover:text-red-600 transition-all duration-500">
                        <ShoppingBag size={28} />
                    </div>
                    <div>
                        <h4 className="font-black uppercase tracking-tight italic text-gray-900">Integração iFood</h4>
                        <p className="text-[10px] text-gray-400 font-medium italic">Receba pedidos automaticamente no seu Kanban.</p>
                    </div>
                </div>
                <div className="flex flex-col items-center text-center gap-3 p-6 group">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 group-hover:bg-green-50 group-hover:text-green-600 transition-all duration-500">
                        <MessageCircle size={28} />
                    </div>
                    <div>
                        <h4 className="font-black uppercase tracking-tight italic text-gray-900">WhatsApp Bot</h4>
                        <p className="text-[10px] text-gray-400 font-medium italic">Automação de atendimento para vender mais rápido.</p>
                    </div>
                </div>
                <div className="flex flex-col items-center text-center gap-3 p-6 group">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all duration-500">
                        <BarChart3 size={28} />
                    </div>
                    <div>
                        <h4 className="font-black uppercase tracking-tight italic text-gray-900">Financeiro & BI</h4>
                        <p className="text-[10px] text-gray-400 font-medium italic">Gráficos poderosos para entender seus lucros.</p>
                    </div>
                </div>
                <div className="flex flex-col items-center text-center gap-3 p-6 group">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 group-hover:bg-amber-50 group-hover:text-amber-600 transition-all duration-500">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h4 className="font-black uppercase tracking-tight italic text-gray-900">Segurança Total</h4>
                        <p className="text-[10px] text-gray-400 font-medium italic">Seus dados protegidos com criptografia de ponta.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
