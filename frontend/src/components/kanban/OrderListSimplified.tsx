'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import {
    Clock,
    CheckCircle2,
    XCircle,
    ChevronRight,
    MessageCircle,
    Package,
    AlertCircle,
    ChevronLeft,
    Calendar,
    Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useBilling } from '@/context/BillingContext';
import { PedidoDetailsModal } from './PedidoDetailsModal';

interface Pedido {
    id: number;
    numero_diario: number;
    cliente_nome: string;
    cliente_whatsapp: string;
    total: string;
    status: string;
    criado_em: string;
    tipo: string;
    endereco: string;
    forma_pagamento: string;
    itens: any[];
}

const STATUS_LABELS: Record<string, { label: string, color: string, bg: string }> = {
    'NOVO': { label: 'Novo', color: 'text-blue-600', bg: 'bg-blue-50' },
    'PREPARO': { label: 'Em Preparo', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    'PRONTO': { label: 'Pronto', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    'DESPACHADO': { label: 'Entrega', color: 'text-orange-600', bg: 'bg-orange-50' },
    'FINALIZADO': { label: 'Finalizado', color: 'text-green-600', bg: 'bg-green-50' },
    'CANCELADO': { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50' },
};

const DIAS_MAP: Record<number, string> = {
    0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab'
};

export const OrderListSimplified = () => {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const { lastMessage } = useSocket();
    const { store } = useBilling();
    const [loading, setLoading] = useState(true);
    const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const getShiftStartHour = (config: any, date: Date) => {
        if (!config?.horario_funcionamento) return 6; // Default 6am
        const diaSemana = DIAS_MAP[date.getDay()];
        const horario = config.horario_funcionamento[diaSemana];
        let openTimeStr = "18:00";

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
            return 15;
        }
    };

    // Initialize date based on business hours
    useEffect(() => {
        if (store) {
            const now = new Date();
            const shiftStartHour = getShiftStartHour(store, now);
            const currentHour = now.getHours();

            if (currentHour < shiftStartHour) {
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                setSelectedDate(yesterday.toISOString().split('T')[0]);
            }
        }
    }, [store]);

    const router = useRouter();

    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');

            // Calculate Shift Range
            let shiftStartHour = 6;
            const dateObj = new Date(selectedDate + 'T12:00:00');
            if (store) {
                shiftStartHour = getShiftStartHour(store, dateObj);
            }

            const start = new Date(dateObj);
            start.setHours(shiftStartHour, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);

            const url = `/api/pedidos/?start_date=${start.toISOString()}&end_date=${end.toISOString()}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setPedidos(Array.isArray(data) ? data : (data.results || []));
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (store) fetchOrders();
    }, [selectedDate, store]);

    useEffect(() => {
        if (lastMessage) {
            if (lastMessage.created) {
                setPedidos(prev => {
                    const alreadyExists = prev.some(p => p.id === lastMessage.id);
                    if (alreadyExists) return prev;
                    return [lastMessage, ...prev];
                });
            } else {
                setPedidos(prev => prev.map(p => p.id === lastMessage.id ? { ...p, ...lastMessage } : p));
                if (selectedPedido && selectedPedido.id === lastMessage.id) {
                    setSelectedPedido(prev => ({ ...prev!, ...lastMessage }));
                }
            }
        }
    }, [lastMessage, selectedPedido]);

    const handleFinalizar = async (id: number) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/pedidos/${id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'FINALIZADO' })
            });
            if (response.ok) {
                setPedidos(prev => prev.map(p => p.id === id ? { ...p, status: 'FINALIZADO' } : p));
            }
        } catch (error) {
            console.error('Error finalizing order:', error);
        }
    };

    const handleStatusChange = (newStatus: string) => {
        if (selectedPedido) {
            setPedidos(prev => prev.map(p => p.id === selectedPedido.id ? { ...p, status: newStatus } : p));
            setSelectedPedido(null);
        }
    };

    const changeDay = (days: number) => {
        const current = new Date(selectedDate + 'T12:00:00');
        current.setDate(current.getDate() + days);
        setSelectedDate(current.toISOString().split('T')[0]);
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black italic uppercase text-gray-900 tracking-tighter">Fila de Pedidos</h1>
                    <p className="text-gray-500 text-sm font-medium">Gerencie sua produção de hoje.</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/pos')}
                        className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        <Plus size={16} /> Registrar Pedido
                    </button>

                    <div className="flex items-center bg-white rounded-2xl p-1 border border-gray-100 shadow-sm">
                        <button
                            onClick={() => changeDay(-1)}
                            className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex items-center gap-2 px-4 font-black italic uppercase text-xs text-gray-900 tracking-tighter">
                            <Calendar size={14} className="text-primary" />
                            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                        </div>
                        <button
                            onClick={() => changeDay(1)}
                            className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="space-y-4">
                {pedidos.length === 0 ? (
                    <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-gray-100">
                        <Package className="mx-auto text-gray-100 mb-4" size={64} />
                        <h3 className="text-gray-900 font-black italic uppercase tracking-tighter text-xl">Nenhum pedido</h3>
                        <p className="text-gray-400 text-sm font-bold mt-1">Nenhum registro encontrado para este dia.</p>
                    </div>
                ) : (
                    pedidos.map((pedido) => (
                        <div
                            key={pedido.id}
                            onClick={() => setSelectedPedido(pedido)}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow cursor-pointer group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex flex-col items-center justify-center border border-gray-100 group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
                                    <span className="text-[10px] font-bold text-gray-400 leading-none">#</span>
                                    <span className="text-lg font-black text-gray-900 leading-none">{pedido.numero_diario || pedido.id}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        {pedido.cliente_nome}
                                        {pedido.tipo === 'ENTREGA' && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase">Entrega</span>}
                                        {pedido.tipo === 'RETIRADA' && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">Retirada</span>}
                                        {pedido.tipo === 'BALCAO' && <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-black uppercase">Balcão</span>}
                                        {pedido.tipo === 'MESA' && <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-black uppercase">Mesa</span>}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_LABELS[pedido.status]?.bg} ${STATUS_LABELS[pedido.status]?.color}`}>
                                            {STATUS_LABELS[pedido.status]?.label || pedido.status}
                                        </span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                                            <Clock size={12} /> {new Date(pedido.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
                                    <span className="text-lg font-black text-primary">R$ {parseFloat(pedido.total).toFixed(2)}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {pedido.status !== 'FINALIZADO' && pedido.status !== 'CANCELADO' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleFinalizar(pedido.id); }}
                                            className="bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                                        >
                                            <CheckCircle2 size={16} /> Finalizar
                                        </button>
                                    )}
                                    <button className="p-2 text-gray-400 group-hover:text-primary hover:bg-gray-50 rounded-lg transition-all">
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
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
