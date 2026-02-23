'use client';

import React from 'react';
import { useBilling } from '@/context/BillingContext';
import {
    CreditCard,
    Check,
    ShieldCheck,
    Clock,
    AlertCircle,
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
    const { store, loading, refreshBilling } = useBilling();
    const [isMigrating, setIsMigrating] = React.useState<string | null>(null);

    const handleMigrate = async (planName: string) => {
        if (!store) return;
        const planIds: Record<string, number> = { 'Basic': 1, 'PRO': 3 };
        const planoId = planIds[planName];
        if (!planoId) return;

        setIsMigrating(planName);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/lojas/${store.slug}/migrar-plano/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ plano_id: planoId })
            });

            if (res.ok) {
                await refreshBilling();
                alert(`Sucesso! Você agora está no plano ${planName}.`);
            } else {
                const data = await res.json();
                alert(`Erro: ${data.error || 'Falha ao migrar plano'}`);
            }
        } catch (error) {
            console.error('Error migrating plan:', error);
            alert('Erro de conexão ao migrar plano.');
        } finally {
            setIsMigrating(null);
        }
    };

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
            name: 'Basic',
            price: '49,90',
            description: 'Essencial para quem foca em Delivery e rapidez.',
            features: [
                'Cardápio Digital Moderno',
                'Pedidos ilimitados via WhatsApp',
                'Até 50 produtos ativos',
                'Gestão de categorias e adicionais',
                'Painel de pedidos simplificado'
            ],
            current: store?.plano_details?.nome === 'Basic'
        },
        {
            name: 'PRO',
            price: '69,90',
            description: 'O controle total para sua operação física e digital com automação.',
            features: [
                'Tudo do plano Basic',
                'PDV Profissional (Frente de Caixa)',
                'Gestão de Mesas e Comandas',
                'Painel Kanban para Cozinha',
                'Controle de estoque inteligente',
                'Automação WhatsApp (Evolution API)',
                'Notificações de status em tempo real',
                'Múltiplos usuários por loja'
            ],
            recommended: true,
            current: store?.plano_details?.nome === 'PRO' || store?.plano_details?.nome === 'Elite'
        }
    ];

    return (
        <div className="p-8 md:p-12 md:pt-16 max-w-7xl mx-auto space-y-12 pb-24">
            <header className="space-y-2">
                <h1 className="text-4xl font-black text-gray-900 italic uppercase tracking-tighter">Assinatura e Planos</h1>
                <p className="text-gray-500 font-medium tracking-tight">Gerencie seu plano e veja detalhes do seu faturamento</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Current Plan Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6 sticky top-8">
                        <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                            <CreditCard className="text-primary" />
                            <h2 className="text-xl font-bold text-gray-900 uppercase italic tracking-tight">Status Atual</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Plano</span>
                                <span className="text-gray-900 font-black italic uppercase">{store?.plano_details?.nome || 'Personalizado'}</span>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Status</span>
                                <div className={`flex items-center gap-2 ${status.color} ${status.bg} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest`}>
                                    <StatusIcon size={12} />
                                    <span>{status.label}</span>
                                </div>
                            </div>

                            {store?.valido_ate && (
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                    <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Vence em</span>
                                    <span className="text-gray-900 font-bold text-sm">{new Date(store.valido_ate).toLocaleDateString('pt-BR')}</span>
                                </div>
                            )}

                            {/* Meta Metrics based on plan */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Produtos</span>
                                    <span className="text-gray-900 font-black text-xs">Até {store?.plano_details?.max_produtos}</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: '40%' }}></div>
                                </div>
                            </div>
                        </div>

                        <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all">
                            Ver Histórico de Pagamentos
                        </button>
                    </div>
                </div>

                {/* Plan Options */}
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10">
                        {plans.map((plan, idx) => (
                            <div
                                key={idx}
                                className={`bg-white rounded-3xl p-8 shadow-sm border transition-all flex flex-col h-full ${plan.current ? 'border-primary ring-2 ring-primary/10 shadow-xl shadow-primary/5 relative' : 'border-gray-100 relative shadow-sm hover:shadow-md'
                                    }`}
                            >
                                {plan.recommended && !plan.current && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full shadow-xl shadow-primary/30 z-20 whitespace-nowrap border-4 border-white">
                                        Recomendado
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h4 className="text-2xl font-black italic uppercase text-gray-900 leading-none">{plan.name}</h4>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-gray-500 text-sm font-bold uppercase">R$</span>
                                        <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                                        <span className="text-gray-400 text-[10px] font-bold uppercase">/mês</span>
                                    </div>
                                    <p className="mt-4 text-gray-500 text-sm font-medium leading-tight">{plan.description}</p>
                                </div>

                                <ul className="space-y-3 mb-8 flex-1">
                                    {plan.features.map((feature, fidx) => (
                                        <li key={fidx} className="flex items-start gap-3 text-xs text-gray-700 font-bold">
                                            <div className="w-4 h-4 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check size={10} strokeWidth={3} />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleMigrate(plan.name)}
                                    disabled={plan.current || !!isMigrating}
                                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${plan.current
                                        ? 'bg-gray-100 text-gray-400 cursor-default'
                                        : plan.recommended
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40'
                                            : 'bg-white border-2 border-gray-100 text-gray-900 hover:border-primary hover:text-primary'
                                        } ${(isMigrating === plan.name) ? 'animate-pulse' : ''}`}
                                >
                                    {plan.current ? 'Seu Plano Atual' : (isMigrating === plan.name ? 'Migrando...' : 'Migrar Plano')}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
