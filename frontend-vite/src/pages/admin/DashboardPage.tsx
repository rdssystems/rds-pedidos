import React from 'react';
import {
    ShoppingBag,
    TrendingUp,
    Clock,
    LayoutGrid,
    CreditCard,
    AlertCircle,
    Banknote
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { Link } from 'react-router-dom';

import { useBilling } from '@/context/BillingContext';
import AIFinanceChat from '@/components/ai/AIFinanceChat';

export default function DashboardPage() {
    const { store } = useBilling();
    const [selectedCategory, setSelectedCategory] = React.useState('all');
    const [period, setPeriod] = React.useState<'today' | '7days' | '30days' | 'custom'>('today');
    const [startDate, setStartDate] = React.useState('');
    const [endDate, setEndDate] = React.useState('');
    const [stats, setStats] = React.useState({
        faturamento: 0,
        pedidos_concluidos: 0,
        total_pedidos: 0,
        ticket_medio: 0,
        em_preparo: 0,
        novos_hoje: 0,
        pedidos_ativos: 0,
        mesas_ocupadas: 0,
        saldo_caixa: 0
    });
    const [chartData, setChartData] = React.useState<any[]>([]);
    const [topProducts, setTopProducts] = React.useState<any[]>([]);
    const [recentOrders, setRecentOrders] = React.useState<any[]>([]);
    const [notifications, setNotifications] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = '/api/dashboard/stats/';

            const params = new URLSearchParams();
            if (period === '7days') {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                params.append('start_date', d.toISOString());
            } else if (period === '30days') {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                params.append('start_date', d.toISOString());
            } else if (period === 'custom' && startDate) {
                params.append('start_date', new Date(startDate).toISOString());
                if (endDate) params.append('end_date', new Date(endDate).toISOString());
            }

            if (selectedCategory && selectedCategory !== 'all') {
                params.append('categoria_id', selectedCategory);
            }

            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.stats) {
                setStats(data.stats);
                setChartData(data.chart_data || []);
                setTopProducts(data.top_products || []);
                setRecentOrders(data.recent_orders || []);
                if (data.notificacoes) setNotifications(data.notificacoes);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchStats();
        if (period === 'today') {
            const interval = setInterval(fetchStats, 30000);
            return () => clearInterval(interval);
        }
    }, [period, startDate, endDate, selectedCategory]);

    const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

    const statCards = [
        { label: 'Faturamento', value: formatCurrency(stats.faturamento), icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Pedidos Hoje', value: stats.total_pedidos.toString(), icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Ticket Médio', value: formatCurrency(stats.ticket_medio), icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { label: 'Saldo em Caixa', value: formatCurrency(stats.saldo_caixa || 0), icon: Banknote, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-8 w-full relative min-h-screen bg-transparent">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 relative z-10">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic border border-primary/20 backdrop-blur-md">
                        <TrendingUp size={12} className="animate-pulse" /> Performance em Tempo Real
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">
                        Dashboard de <span className="text-primary">Gestão</span>
                    </h2>
                    <p className="text-gray-400 text-sm font-semibold italic">Acompanhe o pulso do seu negócio com dados estratégicos.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-white/60 backdrop-blur-xl p-2 rounded-xl shadow-xl shadow-gray-200/50 border border-white/40">
                    {(['today', '7days', '30days', 'custom'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${period === p
                                ? 'bg-gray-900 text-white shadow-2xl shadow-gray-900/40 scale-105'
                                : 'text-gray-400 hover:text-gray-900 hover:bg-white/80'
                                }`}
                        >
                            {p === 'today' ? 'Hoje' : p === '7days' ? '7 Dias' : p === '30days' ? '30 Dias' : 'Personalizado'}
                        </button>
                    ))}
                </div>
            </header>

            {notifications.length > 0 && (
                <div className="space-y-3 z-10 relative">
                    {notifications.map((notif: any) => (
                        <div key={notif.id} className="bg-blue-50/80 backdrop-blur-md border border-blue-200 p-4 rounded-lg flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                            <div className="bg-blue-500 text-white p-2 rounded-full shrink-0">
                                <AlertCircle size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-blue-900 text-sm">{notif.titulo}</h4>
                                <p className="text-blue-700 text-xs mt-1 leading-relaxed">{notif.mensagem}</p>
                                <p className="text-blue-400 text-[10px] mt-2 font-medium uppercase tracking-widest">{new Date(notif.criado_em).toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {period === 'custom' && (
                <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-xl shadow-2xl shadow-gray-100/50 border border-white/60 flex flex-wrap items-end gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Início do Período</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="block w-full px-5 py-3.5 bg-white/80 border border-gray-100 rounded-xl text-xs font-black focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Fim do Período</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="block w-full px-5 py-3.5 bg-white/80 border border-gray-100 rounded-xl text-xs font-black focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner"
                        />
                    </div>
                </div>
            )}

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/60 backdrop-blur-xl p-6 rounded-xl border border-white/60 shadow-lg flex items-center gap-4">
                    <div className="p-4 bg-orange-500/10 text-orange-500 rounded-xl">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pedidos Ativos</p>
                        <p className="text-2xl font-black text-gray-900 italic">{stats.pedidos_ativos}</p>
                    </div>
                </div>
                <div className="bg-white/60 backdrop-blur-xl p-6 rounded-xl border border-white/60 shadow-lg flex items-center gap-4">
                    <div className="p-4 bg-blue-500/10 text-blue-500 rounded-xl">
                        <LayoutGrid size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mesas Ocupadas</p>
                        <p className="text-2xl font-black text-gray-900 italic">{stats.mesas_ocupadas}</p>
                    </div>
                </div>
                {statCards.slice(0, 2).map((stat, idx) => (
                    <div key={idx} className="bg-white/60 backdrop-blur-xl p-6 rounded-xl border border-white/60 shadow-lg flex items-center gap-4">
                        <div className={`p-4 ${stat.bg} ${stat.color} rounded-xl`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-900 italic">{loading ? '...' : stat.value}</p>
                        </div>
                    </div>
                ))}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/70 backdrop-blur-2xl p-8 rounded-xl shadow-2xl border border-white/60 min-h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="font-black text-gray-900 uppercase italic tracking-tighter text-xl">Curva de Receita</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Desempenho financeiro por hora</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black text-primary italic leading-none">{formatCurrency(stats.faturamento)}</span>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Total do Período</p>
                        </div>
                    </div>
                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ff4d4d" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ff4d4d" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="hour"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#999' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#999' }}
                                    tickFormatter={(v) => `R$${v}`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                    formatter={(value: any) => [formatCurrency(value), 'Faturamento']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#ff4d4d"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorTotal)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-2xl p-8 rounded-xl shadow-2xl border border-white/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h3 className="font-black text-gray-900 uppercase italic tracking-tighter text-xl">Mais Pedidos</h3>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="text-xs font-black uppercase tracking-widest bg-white border border-gray-200 text-gray-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer shadow-sm disabled:opacity-50"
                        >
                            <option value="all">Todas as Categorias</option>
                            {Array.isArray(store?.categorias) && store.categorias.map((cat: any) => (
                                <option key={cat?.id || Math.random()} value={String(cat?.id || '')}>
                                    {cat?.nome || 'Categoria'}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-4">
                        {loading ? (
                            [1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 animate-pulse rounded-lg"></div>)
                        ) : (!Array.isArray(topProducts) || topProducts.length === 0) ? (
                            <p className="text-center py-10 text-gray-400 text-xs italic font-bold uppercase">Sem dados ainda</p>
                        ) : (
                            topProducts.map((prod, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-white/40 rounded-lg border border-white hover:border-primary/20 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 flex items-center justify-center bg-gray-900 text-white text-[10px] font-black italic rounded-lg">#{idx + 1}</span>
                                        <p className="text-sm font-bold text-gray-800">{prod.name}</p>
                                    </div>
                                    <span className="text-xs font-black text-primary italic">{prod.qty}x</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-8">
                <div className="bg-white/70 backdrop-blur-2xl rounded-xl shadow-2xl border border-white/60 overflow-hidden">
                    <div className="p-8 border-b border-white/40 flex justify-between items-center">
                        <h3 className="font-black text-gray-900 uppercase italic tracking-tighter text-xl">Eventos de <span className="text-primary italic">Venda</span></h3>
                        <Link to="/orders" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Ver Todos</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/40 text-[9px] font-black text-gray-400 uppercase tracking-widest divide-x divide-gray-100">
                            <tr>
                                <th className="px-8 py-4">ID/Hora</th>
                                <th className="px-8 py-4">Itens Pedidos</th>
                                <th className="px-6 py-4 text-center">Pagamento</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-8 py-4 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-10 text-center text-gray-400 italic font-black uppercase text-[10px]">Carregando...</td></tr>
                            ) : (
                                recentOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-white/40 transition-all group">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-gray-900 italic tracking-tighter">#{order.id}</span>
                                                <span className="text-[9px] text-gray-400 font-bold uppercase">
                                                    {new Date(order.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="max-w-[300px]">
                                                <p className="text-xs font-bold text-gray-700 truncate">
                                                    {order.itens?.map((i: any) => i.produto_obj?.nome).join(', ')}
                                                </p>
                                                <p className="text-[9px] text-gray-400 italic">De: {order.cliente_nome}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex flex-col items-center">
                                                <CreditCard size={12} className="text-gray-400 mb-1" />
                                                <span className="text-[9px] font-black text-gray-600 uppercase">{order.forma_pagamento}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border ${order.status === 'FINALIZADO' ? 'bg-green-500/10 text-green-600 border-green-200' : 'bg-primary/10 text-primary border-primary/20'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black italic text-gray-900 group-hover:text-primary transition-colors">
                                            {formatCurrency(parseFloat(order.total))}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <AIFinanceChat />
    </div>
);
}

DashboardPage.displayName = 'DashboardPage';
