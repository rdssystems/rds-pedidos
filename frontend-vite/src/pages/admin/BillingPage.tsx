import React, { useState } from 'react';
import {
    Check,
    Zap,
    Rocket,
    ShieldCheck,
    Star,
    ArrowRight,
    ShoppingBag,
    MessageCircle,
    BarChart3
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBilling } from '@/context/BillingContext';

const plans = [
    {
        id: 'start',
        name: 'Start',
        price: '69,90',
        description: 'Ideal para quem está começando a organizar sua operação.',
        icon: <Rocket className="text-blue-500" size={24} />,
        color: 'blue',
        features: [
            'Cardápio Digital',
            'Cadastro de Produtos Ilimitado',
            '1 Conta de Equipe',
            'Suporte via E-mail'
        ],
        notIncluded: [
            'Gestão de Pedidos (Kanban)',
            'Mesas e Comandas',
            'Integração iFood (Em breve)',
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
        price: '149,90',
        description: 'Potência total com automação e IA para restaurantes.',
        icon: <Zap className="text-red-500" size={24} />,
        color: 'red',
        popular: true,
        features: [
            'Tudo do Plano Start',
            'Gestão de Pedidos (Kanban)',
            'Mesas e Comandas',
            'Integração iFood Oficial (Em breve)',
            'Atendente de I.A no WhatsApp',
            'Dashboard de BI (Analytics)',
            'Módulo Multi-lojas',
            'Gestão de Estoque Avançada',
            'Até 10 Contas de Equipe',
            'Até 1000 Produtos',
            'Suporte Prioritário WhatsApp'
        ],
        notIncluded: [],
        buttonText: 'Assinar Pro',
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
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 animate-in fade-in duration-500 overflow-hidden h-full flex flex-col">
            {message && (
                <div className={`p-4 rounded-xl text-sm font-bold italic fixed top-5 right-5 z-50 animate-bounce shadow-2xl ${message.type === 'success' ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-red-100 text-red-600 border border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            <header className="text-center space-y-2 max-w-2xl mx-auto shrink-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[9px] font-black uppercase tracking-widest italic border border-red-100">
                    <Star size={12} fill="currentColor" /> Escolha o seu plano
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 italic uppercase tracking-tighter leading-none">
                    Eleve o nível do seu <span className="text-primary">Negócio</span>
                </h1>
                <p className="text-sm text-gray-500 font-medium italic">
                    Sem taxas de adesão. Sem contratos de fidelidade. Cancele quando quiser.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 max-w-4xl mx-auto flex-1 h-full">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`relative bg-white rounded-2xl p-6 py-8 flex flex-col transition-all duration-500 hover:shadow-2xl ${plan.popular
                            ? 'ring-2 ring-primary ring-offset-4 shadow-2xl shadow-primary/20 md:scale-105 z-10'
                            : 'border border-gray-100 shadow-xl shadow-gray-200/50 hover:-translate-y-2'
                            }`}
                    >
                        {plan.popular && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/40 italic">
                                ⭐ Mais Escolhido
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-8">
                            <div className={`p-4 rounded-[1.5rem] bg-${plan.color === 'blue' ? 'blue' : 'primary'}/10 text-${plan.color === 'blue' ? 'blue' : 'primary'}-600`}>
                                {plan.icon}
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100 italic">
                                {plan.badge}
                            </span>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-gray-900 mb-2">{plan.name}</h2>
                            <p className="text-sm text-gray-500 font-medium italic leading-relaxed">{plan.description}</p>
                        </div>

                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-lg font-black text-gray-900 italic">R$</span>
                            <span className="text-4xl md:text-5xl font-black text-gray-900 italic tracking-tighter">{plan.price}</span>
                            <span className="text-gray-400 font-black italic uppercase text-[10px] tracking-widest">/mês</span>
                        </div>

                        <div className="space-y-2 flex-1 mb-6 border-t border-gray-100 pt-6">
                            {plan.features.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 shadow-sm">
                                        <Check size={12} strokeWidth={4} />
                                    </div>
                                    <span className="text-sm font-bold italic text-gray-700">{feature}</span>
                                </div>
                            ))}
                            {plan.notIncluded.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3 opacity-30">
                                    <div className="w-5 h-5 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center shrink-0 border border-gray-100">
                                        <Check size={12} strokeWidth={4} />
                                    </div>
                                    <span className="text-sm font-bold italic text-gray-400 line-through">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => handleSubscription(plan.id)}
                            disabled={!!loading}
                            className={`w-full py-5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 mt-auto group ${plan.popular
                                ? 'bg-primary text-white shadow-primary/20 hover:shadow-primary/40 hover:bg-red-700'
                                : 'bg-gray-900 text-white shadow-gray-900/20 hover:shadow-gray-900/40 hover:bg-black'
                                }`}
                        >
                            {loading === plan.id ? (
                                <div className="w-5 h-5 border-b-2 border-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    {plan.buttonText}
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* Footer removido para caber na tela sem rolagem conforme solicitado */}
        </div>
    );
}
