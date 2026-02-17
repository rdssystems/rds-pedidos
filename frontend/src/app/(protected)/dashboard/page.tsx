'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    ShoppingBag,
    UtensilsCrossed,
    Settings,
    TrendingUp,
    Clock,
    Plus,
    ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
    const [stats, setStats] = React.useState({
        faturamento: 0,
        pedidos_concluidos: 0,
        total_pedidos: 0,
        ticket_medio: 0,
        em_preparo: 0,
        novos_hoje: 0
    });
    const [recentOrders, setRecentOrders] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/dashboard/stats/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.stats) {
                    setStats(data.stats);
                    setRecentOrders(data.recent_orders || []);
                }
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

    const statCards = [
        { label: 'Pedidos Hoje', value: stats.total_pedidos.toString(), icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Faturamento', value: formatCurrency(stats.faturamento), icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Ticket Médio', value: formatCurrency(stats.ticket_medio), icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    ];

    const quickActions = [
        { title: 'Gerenciar Cardápio', desc: 'Categorias e produtos', icon: UtensilsCrossed, href: '/menu', color: 'bg-orange-500' },
        { title: 'Painel de Pedidos', desc: `${stats.em_preparo} em preparo • ${stats.novos_hoje} novos`, icon: ShoppingBag, href: '/orders', color: 'bg-blue-500' },
        { title: 'Configurações', desc: 'Logo, cores e Zap', icon: Settings, href: '/settings', color: 'bg-gray-800' },
    ];

    return (
        <div className="p-8 space-y-10">
            <header className="flex justify-between items-center max-w-7xl mx-auto">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Bem-vindo de volta! 👋</h2>
                    <p className="text-gray-500 mt-1">Aqui está o que está acontecendo na sua loja hoje.</p>
                </div>
                <Link href="/menu" className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                    <Plus size={20} />
                    <span>Novo Item</span>
                </Link>
            </header>

            <section className="max-w-7xl mx-auto space-y-10">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {statCards.map((stat, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
                            <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
                                <stat.icon size={24} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-500 text-sm font-medium">{stat.label}</span>
                                <span className="text-2xl font-black text-gray-900">{loading ? '...' : stat.value}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                    <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tight border-l-4 border-primary pl-4">Ações Rápidas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {quickActions.map((action, idx) => (
                            <Link key={idx} href={action.href} className="group">
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-start gap-4">
                                    <div className={`${action.color} text-white p-4 rounded-2xl shadow-lg`}>
                                        <action.icon size={28} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">{action.title}</h4>
                                        <p className="text-gray-500 text-sm mt-1">{action.desc}</p>
                                    </div>
                                    <div className="mt-4 flex items-center text-primary font-bold text-sm uppercase tracking-wider gap-1">
                                        Acessar <ChevronRight size={16} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Orders Preview */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-black text-gray-900 uppercase italic tracking-tight">Últimos Pedidos</h3>
                        <Link href="/orders" className="text-primary font-bold text-sm hover:underline">Ver todos</Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {loading ? (
                            <div className="p-8 text-center text-gray-400">Carregando pedidos...</div>
                        ) : recentOrders.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">Nenhum pedido hoje.</div>
                        ) : (
                            recentOrders.map((order) => (
                                <div key={order.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${order.status === 'NOVO' ? 'bg-blue-100 text-blue-600' :
                                            order.status === 'FINALIZADO' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            #{order.id}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{order.cliente_nome}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[200px] mb-1">
                                                {order.itens?.map((i: any) => `${i.quantidade}x ${i.produto_obj?.nome || 'Item'}`).join(', ') || 'Sem itens'}
                                            </p>
                                            <div className="flex gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                <span>{new Date(order.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span>•</span>
                                                <span>{order.forma_pagamento}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-gray-900">{formatCurrency(parseFloat(order.total))}</p>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${order.status === 'NOVO' ? 'bg-blue-100 text-blue-600' :
                                            order.status === 'FINALIZADO' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
