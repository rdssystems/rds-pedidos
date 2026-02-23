'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useNotifications } from '@/hooks/useNotifications';
import { PedidoCard } from './PedidoCard';
import { PedidoDetailsModal } from './PedidoDetailsModal';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface Pedido {
    id: number;
    numero_diario: number;
    cliente_nome: string;
    cliente_whatsapp: string;
    total: string;
    status: string;
    criado_em: string;
    endereco: string;
    forma_pagamento: string;
    itens: any[];
}

const COLUMNS = [
    { id: 'NOVO', title: 'Novos', color: 'bg-blue-50' },
    { id: 'PREPARO', title: 'Em Preparo', color: 'bg-yellow-50' },
    { id: 'PRONTO', title: 'Prontos', color: 'bg-indigo-50' },
    { id: 'DESPACHADO', title: 'Entrega', color: 'bg-orange-50' },
    { id: 'FINALIZADO', title: 'Finalizados', color: 'bg-green-50' },
];

const DIAS_MAP: Record<number, string> = {
    0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab'
};

export const KanbanBoard = () => {
    const { lastMessage } = useSocket();
    const { playAlert, stopAlert } = useNotifications();
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
    const [storeConfig, setStoreConfig] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    // Date Filters
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isStoreLoaded, setIsStoreLoaded] = useState(false);

    const router = useRouter();

    // 1. Fetch User Store Config to understand Shifts
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                // First get user info to find store slug
                const userRes = await fetch('/api/users/me/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!userRes.ok) return;
                const userData = await userRes.json();

                // Set role - Prioritize Owner/Manager
                const roles = userData.roles || [];
                // Check if user has any high-level role
                const isManagerial = roles.some((r: any) => ['owner', 'manager', 'cashier'].includes(r.role));

                if (isManagerial) {
                    // Start with 'owner' effectively for UI purposes if they have any managerial role
                    setUserRole('owner');
                } else if (roles.length > 0) {
                    setUserRole(roles[0].role);
                }

                // Assuming first owned store or role store
                // Improve this if user has multiple stores
                let slug = null;
                if (userData.roles && userData.roles.length > 0) {
                    slug = userData.roles[0].store_slug;
                }

                if (slug) {
                    const storeRes = await fetch(`/api/lojas/${slug}/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (storeRes.ok) {
                        const storeData = await storeRes.json();
                        setStoreConfig(storeData);
                        return storeData;
                    }
                }
            } catch (error) {
                console.error("Error loading store config:", error);
            }
            return null;
        };

        fetchConfig().then((config) => {
            setIsStoreLoaded(true);
            if (config) {
                // Calculate correct initial date based on Shift
                const now = new Date();
                const shiftStartHour = getShiftStartHour(config, now);

                // If now < shiftStartHour (e.g. it's 14:00 and shift starts at 15:00), 
                // we are technically in Yesterday's shift from a business perspective? 
                // OR user wants to see "Today's" shift which hasn't started?
                // Usually: "Show me the current active shift".
                // If it's 02:00 AM and we close at 03:00 AM, we are in Yesterday's shift.
                // Logic: If current hour < (OpenHour - 3h), it is previous day.

                const currentHour = now.getHours();
                if (currentHour < shiftStartHour) {
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    setSelectedDate(yesterday.toISOString().split('T')[0]);
                } else {
                    setSelectedDate(now.toISOString().split('T')[0]);
                }
            }
        });
    }, []);

    const getShiftStartHour = (config: any, date: Date) => {
        if (!config?.horario_funcionamento) return 6; // Default 6am

        const diaSemana = DIAS_MAP[date.getDay()];
        const horario = config.horario_funcionamento[diaSemana];

        let openTimeStr = "18:00"; // Default fallback

        if (horario) {
            if (typeof horario === 'string' && horario.includes('-')) {
                openTimeStr = horario.split('-')[0].trim();
            } else if (typeof horario === 'object' && !horario.closed) {
                openTimeStr = horario.open;
            }
        }

        try {
            const openH = parseInt(openTimeStr.split(':')[0]);
            let shiftStart = openH - 3;
            if (shiftStart < 0) shiftStart += 24;
            return shiftStart;
        } catch (e) {
            return 15; // Default 15:00 (3h before 18:00)
        }
    };

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                // Calculate Start/End ISO strings for filtering
                // ALWAYS calculate range. Default to 6am if storeConfig not loaded yet.
                let shiftStartHour = 6;
                const dateObj = new Date(selectedDate + 'T12:00:00'); // Midday

                if (storeConfig) {
                    shiftStartHour = getShiftStartHour(storeConfig, dateObj);
                }

                const start = new Date(dateObj);
                start.setHours(shiftStartHour, 0, 0, 0);

                const end = new Date(start);
                end.setDate(end.getDate() + 1); // +24h

                const startIso = start.toISOString();
                const endIso = end.toISOString();

                // Always filter by date range
                const url = `/api/pedidos/?start_date=${startIso}&end_date=${endIso}`;

                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.status === 401) {
                    router.push('/login');
                    return;
                }

                const data = await response.json();

                let results = [];
                if (Array.isArray(data)) results = data;
                else if (data && Array.isArray(data.results)) results = data.results;

                setPedidos(results);

            } catch (error) {
                console.error('Error fetching orders:', error);
                setPedidos([]);
            }
        };

        fetchOrders();
    }, [router, selectedDate, storeConfig]);

    useEffect(() => {
        // Socket updates mostly append 'today's' orders.
        // Needs handling if we are viewing past dates? 
        // For now, let's allow live updates to appear at top, user will realize.
        if (lastMessage) {
            if (lastMessage.created) {
                setPedidos(prev => {
                    const alreadyExists = prev.some(p => p.id === lastMessage.id);
                    if (alreadyExists) return prev;
                    return [lastMessage, ...prev];
                });
                playAlert();
            } else {
                setPedidos(prev => prev.map(p =>
                    p.id === lastMessage.id ? { ...p, ...lastMessage } : p
                ));
                if (selectedPedido && selectedPedido.id === lastMessage.id) {
                    setSelectedPedido(prev => ({ ...prev!, ...lastMessage }));
                }
            }
        }
    }, [lastMessage]);

    // Handlers
    const handleVerPedido = (id: number) => {
        const pedido = pedidos.find(p => p.id === id);
        if (pedido) {
            setSelectedPedido(pedido);
            stopAlert();
        }
    };

    // ... rest of handlers (handleStatusChange, handleAdvanceStatus) same as before ... 
    const handleStatusChange = async (newStatus: string) => {
        if (!selectedPedido) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/pedidos/${selectedPedido.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                const updatedPedido = { ...selectedPedido, status: newStatus };
                setPedidos(prev => prev.map(p => p.id === selectedPedido.id ? updatedPedido : p));
                setSelectedPedido(null);
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleAdvanceStatus = async (pedido: Pedido) => {
        // Permission Check for Drivers
        if (userRole === 'driver') {
            if (pedido.status !== 'PRONTO' && pedido.status !== 'DESPACHADO') {
                alert('Entregadores só podem mover pedidos Prontos ou em Entrega.');
                return;
            }
        }

        const statusFlow: Record<string, string> = {
            'NOVO': 'PREPARO',
            'PREPARO': 'PRONTO',
            'PRONTO': 'DESPACHADO',
            'DESPACHADO': 'FINALIZADO'
        };

        const nextStatus = statusFlow[pedido.status];
        if (!nextStatus) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/pedidos/${pedido.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: nextStatus })
            });

            if (response.ok) {
                setPedidos(prev => prev.map(p =>
                    p.id === pedido.id ? { ...p, status: nextStatus } : p
                ));
            }
        } catch (error) {
            console.error('Error advancing status:', error);
        }
    };

    // Date Navigation Helpers
    const changeDate = (days: number) => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 overflow-hidden relative">
            {/* Header / Date Filter */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white rounded-md shadow-sm transition-all text-gray-600 hover:text-primary">
                        <ChevronLeft size={20} />
                    </button>

                    <div className="relative group">
                        <div className="flex items-center gap-2 px-4 py-2 cursor-pointer">
                            <Calendar size={18} className="text-primary" />
                            <span className="font-bold text-gray-700 text-sm uppercase tracking-wider">
                                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                            </span>
                        </div>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                    </div>

                    <button onClick={() => changeDate(1)} className="p-2 hover:bg-white rounded-md shadow-sm transition-all text-gray-600 hover:text-primary">
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                    >
                        Hoje
                    </button>
                    <div className="h-4 w-px bg-gray-300 mx-2"></div>
                    <span className="text-xs font-medium text-gray-400">
                        {pedidos.length} pedidos
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto p-6">
                <div className="flex gap-6 h-full min-w-max">
                    {COLUMNS
                        .filter(col => {
                            if (userRole === 'driver') {
                                return col.id === 'PRONTO' || col.id === 'DESPACHADO';
                            }
                            return true;
                        })
                        .map(column => (
                            <div key={column.id} className={`w-80 rounded-[2rem] flex flex-col ${column.color} shadow-sm border border-white/50`}>
                                <div className="p-6 flex justify-between items-center border-b border-gray-200/50">
                                    <h2 className="font-black text-gray-700 uppercase tracking-widest text-xs flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${column.id === 'NOVO' ? 'bg-blue-500' :
                                            column.id === 'PREPARO' ? 'bg-yellow-500' :
                                                column.id === 'PRONTO' ? 'bg-indigo-500' :
                                                    column.id === 'DESPACHADO' ? 'bg-orange-500' :
                                                        'bg-green-500'
                                            }`}></div>
                                        {column.title}
                                    </h2>
                                    <span className="bg-white/80 px-3 py-1 rounded-xl text-xs font-black text-gray-400 shadow-sm backdrop-blur-sm">
                                        {pedidos.filter(p => p.status === column.id).length}
                                    </span>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                                    {pedidos
                                        .filter(p => p.status === column.id)
                                        .map(pedido => (
                                            <PedidoCard
                                                key={pedido.id}
                                                pedido={pedido}
                                                onVerPedido={handleVerPedido}
                                                onAvançar={() => handleAdvanceStatus(pedido)}
                                            />
                                        ))
                                    }
                                    {pedidos.filter(p => p.status === column.id).length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-2">
                                            <div className="w-12 h-12 bg-gray-900/5 rounded-full"></div>
                                            <p className="text-xs font-black uppercase tracking-widest text-gray-900">Vazio</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {selectedPedido && (
                <PedidoDetailsModal
                    pedido={selectedPedido}
                    onClose={() => setSelectedPedido(null)}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
};
