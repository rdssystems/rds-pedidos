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
import { useNavigate, Link } from 'react-router-dom';

import { useBilling } from '@/context/BillingContext';
import { useAuth } from '@/context/AuthContext';
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
    const { user } = useAuth();
    const userRoles = user?.roles?.map(r => r.role) || [];
    const [loading, setLoading] = useState(true);
    const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString(new Date()));

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
                setSelectedDate(getLocalDateString(yesterday));
            } else {
                setSelectedDate(getLocalDateString(now));
            }
        }
    }, [store]);

    const navigate = useNavigate();

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
            if (lastMessage.is_new || lastMessage.created === true) {
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
        const pedido = pedidos.find(p => p.id === id);
        if (!pedido) return;

        let nextStatus = '';
        const currentStatus = pedido.status;
        const tipo = pedido.tipo;

        if (store?.plano_tipo === 'START') {
            const statusMap: Record<string, string> = {
                'NOVO': 'PREPARO',
                'PREPARO': 'PRONTO',
                'PRONTO': 'FINALIZADO',
                'DESPACHADO': 'FINALIZADO'
            };
            nextStatus = statusMap[currentStatus];
        } else {
            const statusMap: Record<string, string> = {
                'NOVO': 'PREPARO',
                'PREPARO': 'PRONTO',
                'PRONTO': tipo !== 'ENTREGA' ? 'FINALIZADO' : 'DESPACHADO',
                'DESPACHADO': 'FINALIZADO',
            };
            nextStatus = statusMap[currentStatus];
        }

        if (!nextStatus) return;

        try {
            const ok = await patchPedidoStatus(id, nextStatus);
            if (ok) {
                setPedidos(prev => prev.map(p => p.id === id ? { ...p, status: nextStatus } : p));
            }
        } catch (error) {
            console.error('Error finalizing order:', error);
        }
    };

    const patchPedidoStatus = async (pedidoId: number, newStatus: string): Promise<boolean> => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/pedidos/${pedidoId}/`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) { 
                alert(`Erro ao atualizar pedido (${response.status}).`); 
                return false; 
            }
            return true;
        } catch { 
            alert('Erro de conexão ao atualizar pedido.'); 
            return false; 
        }
    };

    const handleModalAdvance = async (pedidoId: number, currentStatus: string, tipo: string) => {
        let nextStatus = '';
        
        if (store?.plano_tipo === 'START') {
            const statusMap: Record<string, string> = {
                'NOVO': 'PREPARO',
                'PREPARO': 'PRONTO',
                'PRONTO': 'FINALIZADO',
                'DESPACHADO': 'FINALIZADO'
            };
            nextStatus = statusMap[currentStatus];
        } else {
            const statusMap: Record<string, string> = {
                'NOVO': 'PREPARO',
                'PREPARO': 'PRONTO',
                'PRONTO': tipo !== 'ENTREGA' ? 'FINALIZADO' : 'DESPACHADO',
                'DESPACHADO': 'FINALIZADO',
            };
            nextStatus = statusMap[currentStatus];
        }

        if (!nextStatus) return;
        
        const ok = await patchPedidoStatus(pedidoId, nextStatus);
        if (ok) {
            setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, status: nextStatus } : p));
            setSelectedPedido(null);
        }
    };

    const handleCancelarPedido = async (pedidoId: number) => {
        if (!window.confirm('Tem certeza que deseja cancelar este pedido?')) return;
        const ok = await patchPedidoStatus(pedidoId, 'CANCELADO');
        if (ok) {
            setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, status: 'CANCELADO' } : p));
            setSelectedPedido(null);
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
        <div className="w-full px-4 md:px-6 py-6 h-full flex flex-col">
            <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-black italic uppercase text-gray-900 tracking-tighter">Fila de Pedidos</h1>
                    <p className="text-gray-500 text-sm font-medium">Gerencie sua produção de hoje.</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/pos')}
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

            {store?.plano_tipo === 'START' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start h-[calc(100vh-220px)] overflow-hidden pb-4">
                    {/* COLUNA 1: NOVOS */}
                    <div className="flex flex-col h-full bg-blue-50/20 rounded-3xl border border-blue-100/30 p-3">
                        <div className="flex items-center justify-between mb-3 px-2">
                            <h2 className="font-black italic uppercase text-[11px] text-blue-600 tracking-tighter">1. Novos</h2>
                            <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg shadow-blue-500/20">
                                {pedidos.filter(p => p.status === 'NOVO' && (p.tipo === 'ENTREGA' || p.tipo === 'BALCAO')).length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            {pedidos.filter(p => p.status === 'NOVO' && (p.tipo === 'ENTREGA' || p.tipo === 'BALCAO')).map(pedido => (
                                <OrderCardItem key={pedido.id} pedido={pedido} onClick={() => setSelectedPedido(pedido)} onFinalizar={handleFinalizar} plano_tipo={store?.plano_tipo} />
                            ))}
                        </div>
                    </div>

                    {/* COLUNA 2: PREPARO */}
                    <div className="flex flex-col h-full bg-orange-50/20 rounded-3xl border border-orange-100/30 p-3">
                        <div className="flex items-center justify-between mb-3 px-2">
                            <h2 className="font-black italic uppercase text-[11px] text-orange-600 tracking-tighter">2. Preparo</h2>
                            <span className="bg-orange-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg shadow-orange-500/20">
                                {pedidos.filter(p => p.status === 'PREPARO' && (p.tipo === 'ENTREGA' || p.tipo === 'BALCAO')).length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            {pedidos.filter(p => p.status === 'PREPARO' && (p.tipo === 'ENTREGA' || p.tipo === 'BALCAO')).map(pedido => (
                                <OrderCardItem key={pedido.id} pedido={pedido} onClick={() => setSelectedPedido(pedido)} onFinalizar={handleFinalizar} plano_tipo={store?.plano_tipo} />
                            ))}
                        </div>
                    </div>

                    {/* COLUNA 3: PRONTOS */}
                    <div className="flex flex-col h-full bg-teal-50/20 rounded-3xl border border-teal-100/30 p-3">
                        <div className="flex items-center justify-between mb-3 px-2">
                            <h2 className="font-black italic uppercase text-[11px] text-teal-600 tracking-tighter">3. Prontos</h2>
                            <span className="bg-teal-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg shadow-teal-500/20">
                                {pedidos.filter(p => ['PRONTO', 'DESPACHADO'].includes(p.status) && (p.tipo === 'ENTREGA' || p.tipo === 'BALCAO')).length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            {pedidos.filter(p => ['PRONTO', 'DESPACHADO'].includes(p.status) && (p.tipo === 'ENTREGA' || p.tipo === 'BALCAO')).map(pedido => (
                                <OrderCardItem key={pedido.id} pedido={pedido} onClick={() => setSelectedPedido(pedido)} onFinalizar={handleFinalizar} plano_tipo={store?.plano_tipo} />
                            ))}
                        </div>
                    </div>

                    {/* COLUNA 4: FINALIZADO */}
                    <div className="flex flex-col h-full bg-green-50/20 rounded-3xl border border-green-100/30 p-3">
                        <div className="flex items-center justify-between mb-3 px-1 ml-1">
                            <h2 className="font-black italic uppercase text-[11px] text-green-600 tracking-tighter">4. Finalizado</h2>
                            <span className="bg-green-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg shadow-green-500/20">
                                {pedidos.filter(p => ['FINALIZADO', 'CANCELADO'].includes(p.status) && (p.tipo === 'ENTREGA' || p.tipo === 'BALCAO')).length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            {pedidos.filter(p => ['FINALIZADO', 'CANCELADO'].includes(p.status) && (p.tipo === 'ENTREGA' || p.tipo === 'BALCAO')).map(pedido => (
                                <OrderCardItem key={pedido.id} pedido={pedido} onClick={() => setSelectedPedido(pedido)} onFinalizar={handleFinalizar} plano_tipo={store?.plano_tipo} />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {pedidos.length === 0 ? (
                        <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-gray-100">
                            <Package className="mx-auto text-gray-100 mb-4" size={64} />
                            <h3 className="text-gray-900 font-black italic uppercase tracking-tighter text-xl">Nenhum pedido</h3>
                            <p className="text-gray-400 text-sm font-bold mt-1">Nenhum registro encontrado para este dia.</p>
                        </div>
                    ) : (
                        pedidos.map((pedido) => (
                            <OrderCardItem key={pedido.id} pedido={pedido} onClick={() => setSelectedPedido(pedido)} onFinalizar={handleFinalizar} plano_tipo={store?.plano_tipo} />
                        ))
                    )}
                </div>
            )}

            {selectedPedido && (
                <PedidoDetailsModal
                    pedido={selectedPedido as any}
                    onClose={() => setSelectedPedido(null)}
                    onAdvance={handleModalAdvance}
                    onCancelar={handleCancelarPedido}
                    storeName={store?.nome}
                />
            )}
        </div>
    );
};

// Extracted Component for Order Card
const OrderCardItem = ({ pedido, onClick, onFinalizar, plano_tipo }: { pedido: Pedido, onClick: () => void, onFinalizar: (id: number) => void, plano_tipo?: string }) => (
    <div
        onClick={onClick}
        className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 flex flex-col gap-2.5 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group relative"
    >
        <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 bg-gray-50 rounded-lg flex flex-col items-center justify-center border border-gray-100 group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors shrink-0">
                    <span className="text-[9px] font-black text-gray-400 leading-none mb-0.5">#</span>
                    <span className="text-[14px] font-black text-gray-900 leading-none">{pedido.numero_diario || pedido.id}</span>
                </div>
                <div className="min-w-0 flex flex-col">
                    <h3 className="font-black text-[13px] text-gray-900 truncate uppercase tracking-tight leading-none mb-1 group-hover:text-primary transition-colors">{pedido.cliente_nome}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {pedido.tipo === 'ENTREGA' && (
                            <span className="text-[8px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">Entrega</span>
                        )}
                        {pedido.tipo === 'BALCAO' && (
                            <span className="text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">Balcão</span>
                        )}
                        <span className="text-[9px] text-gray-300 flex items-center gap-1 font-bold">
                            <Clock size={10} className="text-gray-300" /> 
                            {new Date(pedido.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>
            <div className="text-right shrink-0">
                <div className="text-[12px] font-black text-red-600 italic flex items-baseline justify-end">
                    <span className="text-[8px] not-italic mr-0.5 text-gray-300 font-bold uppercase tracking-widest">Total</span>
                    R$ {parseFloat(pedido.total).toFixed(2)}
                </div>
            </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-50/80 pt-3 mt-1">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${STATUS_LABELS[pedido.status]?.bg} ${STATUS_LABELS[pedido.status]?.color} border border-current/10`}>
                {STATUS_LABELS[pedido.status]?.label || pedido.status}
            </span>
            <div className="flex items-center gap-2">
                {pedido.status !== 'FINALIZADO' && pedido.status !== 'CANCELADO' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onFinalizar(pedido.id); }}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-green-600 shadow-md shadow-green-500/10 active:scale-95 transition-all outline-none"
                    >
                        <CheckCircle2 size={13} />
                        {plano_tipo === 'START' ? (
                            pedido.status === 'NOVO' ? 'PREPARAR' : 
                            pedido.status === 'PREPARO' ? 'PRONTO' : 'CONCLUIR'
                        ) : 'CONCLUIR'}
                    </button>
                )}
                <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <ChevronRight size={16} />
                </div>
            </div>
        </div>
    </div>
);
