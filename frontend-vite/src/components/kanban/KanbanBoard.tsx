'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useNotifications } from '@/hooks/useNotifications';
import { PedidoCard } from './PedidoCard';
import { PedidoDetailsModal } from './PedidoDetailsModal';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, Printer, History as HistoryIcon, X, MessageCircle, Save, Clock, ShoppingBag, MessageSquare, AlertCircle, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { printPedido } from '@/utils/printPedido';

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
    tipo: string;
    itens: any[];
}

const COLUMNS = [
    { id: 'NOVO',       title: 'NOVOS',      iconColor: 'bg-blue-500',   accent: 'border-t-blue-400' },
    { id: 'PREPARO',    title: 'PREPARO',    iconColor: 'bg-amber-500',  accent: 'border-t-amber-400' },
    { id: 'PRONTO',     title: 'PRONTOS',    iconColor: 'bg-teal-500',   accent: 'border-t-teal-400' },
    { id: 'DESPACHADO', title: 'ENTREGA',    iconColor: 'bg-orange-500', accent: 'border-t-orange-400' },
    { id: 'FINALIZADO', title: 'CONCLUÍDOS', iconColor: 'bg-green-500',  accent: 'border-t-green-400' },
];

const HIDDEN_STATUSES = ['CANCELADO'];

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
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);
    const navigate = useNavigate();

    // CRM / Histórico State
    const [selectedClientDetail, setSelectedClientDetail] = useState<any>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    const getLocalDateString = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString(new Date()));

    const getShiftStartHour = useCallback((config: any, date: Date): number => {
        if (!config?.horario_funcionamento) return 6;
        const diaSemana = DIAS_MAP[date.getDay()];
        const horario = config.horario_funcionamento[diaSemana];
        let openTimeStr = '18:00';
        if (horario) {
            if (typeof horario === 'string' && horario.includes('-')) openTimeStr = horario.split('-')[0].trim();
            else if (typeof horario === 'object' && !horario.closed) openTimeStr = horario.open;
        }
        try {
            const openH = parseInt(openTimeStr.split(':')[0]);
            let shiftStart = openH - 3;
            if (shiftStart < 0) shiftStart += 24;
            return shiftStart;
        } catch { return 15; }
    }, []);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return null;
                const userRes = await fetch('/api/users/me/', { headers: { Authorization: `Bearer ${token}` } });
                if (!userRes.ok) return null;
                const userData = await userRes.json();
                const roles = userData.roles || [];
                const isManagerial = roles.some((r: any) => ['owner', 'manager', 'cashier'].includes(r.role));
                if (isManagerial) setUserRole('owner');
                else if (roles.length > 0) setUserRole(roles[0].role);
                const slug = userData.roles?.[0]?.store_slug;
                if (slug) {
                    const storeRes = await fetch(`/api/lojas/${slug}/`, { headers: { Authorization: `Bearer ${token}` } });
                    if (storeRes.ok) {
                        const storeData = await storeRes.json();
                        setStoreConfig(storeData);
                        return storeData;
                    }
                }
            } catch (err) { console.error('Error loading config:', err); }
            return null;
        };
        fetchConfig().then((config) => {
            if (config) {
                const now = new Date();
                const shiftStart = getShiftStartHour(config, now);
                if (now.getHours() < shiftStart) {
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    setSelectedDate(getLocalDateString(yesterday));
                } else {
                    setSelectedDate(getLocalDateString(now));
                }
            }
        });
    }, [getShiftStartHour]);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const dateObj = new Date(selectedDate + 'T12:00:00');
                const shiftHour = storeConfig ? getShiftStartHour(storeConfig, dateObj) : 6;
                const start = new Date(dateObj);
                start.setHours(shiftHour, 0, 0, 0);
                const end = new Date(start);
                end.setDate(end.getDate() + 1);
                const url = `/api/pedidos/?start_date=${start.toISOString()}&end_date=${end.toISOString()}&include_pending=true`;
                const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                if (response.status === 401) { navigate('/login'); return; }
                const data = await response.json();
                const results: Pedido[] = Array.isArray(data) ? data : (data?.results ?? []);
                setPedidos(results.filter(p => !HIDDEN_STATUSES.includes(p.status)));
            } catch (err) { console.error('Error fetching orders:', err); setPedidos([]); }
        };
        fetchOrders();
    }, [navigate, selectedDate, storeConfig, getShiftStartHour]);

    useEffect(() => {
        if (!lastMessage) return;
        const isNew = lastMessage.action === 'new' || lastMessage.is_new || lastMessage.created === true;
        const orderData: Pedido = lastMessage.pedido || lastMessage;
        if (isNew) {
            setPedidos(prev => {
                if (prev.some(p => p.id === orderData.id)) return prev;
                return [orderData, ...prev];
            });
            playAlert();
        } else {
            if (orderData.status && HIDDEN_STATUSES.includes(orderData.status)) {
                setPedidos(prev => prev.filter(p => p.id !== orderData.id));
                if (selectedPedido?.id === orderData.id) setSelectedPedido(null);
            } else {
                setPedidos(prev => prev.map(p => p.id === orderData.id ? { ...p, ...orderData } : p));
                if (selectedPedido?.id === orderData.id)
                    setSelectedPedido(prev => prev ? { ...prev, ...orderData } : prev);
            }
        }
    }, [lastMessage]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleVerPedido = (id: number) => {
        const pedido = pedidos.find(p => p.id === id);
        if (pedido) { setSelectedPedido(pedido); stopAlert(); }
    };

    const closeModal = () => setSelectedPedido(null);

    const handleOpenHistory = async (whatsapp: string) => {
        try {
            // Limpa o número (apenas dígitos) para garantir o filtro correto
            const cleanedWhatsapp = whatsapp.replace(/\D/g, '');
            if (!cleanedWhatsapp) {
                alert('Este pedido não possui um número de WhatsApp vinculado.');
                return;
            }

            const token = localStorage.getItem('token');
            const tiendaId = storeConfig?.id;
            if (!tiendaId) return;

            const res = await fetch(`/api/pedidos/get-cliente-detalhes/?loja_id=${tiendaId}&whatsapp=${cleanedWhatsapp}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Erro ao buscar histórico');
            const data = await res.json();
            setSelectedClientDetail(data);
            setIsHistoryModalOpen(true);
        } catch (err) {
            console.error(err);
            alert('Não foi possível carregar o histórico do cliente.');
        }
    };

    const handleSaveNotes = async () => {
        if (!selectedClientDetail?.perfil) return;
        setIsSavingNotes(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/pedidos/salvar-cliente-perfil/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    loja_id: storeConfig?.id,
                    whatsapp: selectedClientDetail.perfil.whatsapp,
                    observacoes: selectedClientDetail.perfil.observacoes
                })
            });
            if (!res.ok) throw new Error('Erro ao salvar');
            alert('Observações salvas com sucesso!');
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar observações.');
        } finally {
            setIsSavingNotes(false);
        }
    };

    const patchPedidoStatus = async (pedidoId: number, newStatus: string): Promise<boolean> => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/pedidos/${pedidoId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) { alert(`Erro ao atualizar pedido (${response.status}).`); return false; }
            return true;
        } catch { alert('Erro de conexão ao atualizar pedido.'); return false; }
    };

    const handleCancelarPedido = async (pedidoId: number) => {
        if (!window.confirm('Tem certeza que deseja cancelar este pedido?')) return;
        const ok = await patchPedidoStatus(pedidoId, 'CANCELADO');
        if (ok) {
            setPedidos(prev => prev.filter(p => p.id !== pedidoId));
            setSelectedPedido(null);
        }
    };

    const handleModalAdvance = async (pedidoId: number, currentStatus: string, tipo: string) => {
        const statusMap: Record<string, string> = {
            NOVO: 'PREPARO',
            PREPARO: 'PRONTO',
            PRONTO: tipo !== 'ENTREGA' ? 'FINALIZADO' : 'DESPACHADO',
            DESPACHADO: 'FINALIZADO',
        };
        const nextStatus = statusMap[currentStatus];
        if (!nextStatus) return;
        const ok = await patchPedidoStatus(pedidoId, nextStatus);
        if (ok) {
            setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, status: nextStatus } : p));
            setSelectedPedido(null);
        }
    };

    const handleCardAdvance = async (pedido: Pedido) => {
        if (userRole === 'driver' && pedido.status !== 'PRONTO') {
            alert('Entregadores só podem mover pedidos de Prontos para Entrega.'); return;
        }
        if (userRole === 'waiter') {
            alert('Atendentes não podem avançar pedidos no Kanban.'); return;
        }
        const statusMap: Record<string, string> = {
            NOVO: 'PREPARO', PREPARO: 'PRONTO',
            PRONTO: pedido.tipo !== 'ENTREGA' ? 'FINALIZADO' : 'DESPACHADO',
            DESPACHADO: 'FINALIZADO',
        };
        const nextStatus = statusMap[pedido.status];
        if (!nextStatus) return;
        if (nextStatus === 'FINALIZADO' && pedido.tipo === 'MESA') {
            alert('Pedidos de mesa são finalizados apenas no caixa.'); return;
        }
        const previousPedidos = [...pedidos];
        setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, status: nextStatus } : p));
        const ok = await patchPedidoStatus(pedido.id, nextStatus);
        if (!ok) setPedidos(previousPedidos);
    };

    const canDragAndDrop = userRole === 'owner' || userRole === 'manager' || userRole === 'cashier';

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: number) => {
        if (!canDragAndDrop) return;
        e.dataTransfer.setData('text/plain', id.toString());
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, colId: string) => {
        e.preventDefault();
        if (!canDragAndDrop) return;
        if (dragOverCol !== colId) setDragOverCol(colId);
    };
    const handleDragLeave = () => setDragOverCol(null);
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, colId: string) => {
        e.preventDefault(); setDragOverCol(null);
        if (!canDragAndDrop) return;
        const pedidoId = parseInt(e.dataTransfer.getData('text/plain'));
        if (!pedidoId) return;
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (!pedido || pedido.status === colId) return;
        if (colId === 'FINALIZADO' && pedido.tipo === 'MESA') {
            alert('Pedidos de mesa são finalizados apenas no caixa.'); return;
        }
        const previous = [...pedidos];
        setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, status: colId } : p));
        const ok = await patchPedidoStatus(pedidoId, colId);
        if (!ok) setPedidos(previous);
    };

    const changeDate = (days: number) => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const currentModalPedido = selectedPedido
        ? (pedidos.find(p => p.id === selectedPedido.id) ?? selectedPedido)
        : null;

    return (
        <div className="flex flex-col h-full overflow-hidden font-sans bg-[#F0F2F5]">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                        <button
                            onClick={() => changeDate(-1)}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="relative px-3 py-1 bg-white rounded-md flex items-center gap-2 border border-gray-200 cursor-pointer">
                            <Calendar size={13} className="text-[#007A87]" />
                            <span className="font-bold text-gray-700 text-xs uppercase tracking-wider">
                                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                                    weekday: 'short', day: '2-digit', month: 'short'
                                })}
                            </span>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                        <button
                            onClick={() => changeDate(1)}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    <button
                        onClick={() => setSelectedDate(getLocalDateString(new Date()))}
                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#007A87] border border-[#007A87]/30 hover:bg-[#007A87]/5 rounded-lg transition-colors"
                    >
                        Hoje
                    </button>
                </div>

                <div className="text-right">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Total do Dia</p>
                    <p className="text-sm font-black text-gray-800 leading-none">{pedidos.length} pedidos</p>
                </div>
            </div>

            {/* Board */}
            <div className="flex-1 overflow-x-auto p-5 flex gap-4">
                {COLUMNS
                    .filter(col => userRole !== 'driver' || col.id === 'PRONTO' || col.id === 'DESPACHADO')
                    .map(column => {
                        const colPedidos = pedidos.filter(p => p.status === column.id);
                        return (
                            <div
                                key={column.id}
                                onDragOver={e => handleDragOver(e, column.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={e => handleDrop(e, column.id)}
                                className={`min-w-[270px] flex-1 rounded-xl flex flex-col border-t-2 transition-all duration-200 ${column.accent} ${
                                    dragOverCol === column.id
                                        ? 'ring-2 ring-[#007A87]/40 shadow-lg'
                                        : 'shadow-sm'
                                }`}
                                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderTopWidth: '2px' }}
                            >
                                {/* Column header */}
                                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${column.iconColor}`} />
                                        <h2 className="font-bold text-gray-600 uppercase tracking-[0.15em] text-[10px]">
                                            {column.title}
                                        </h2>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                                        {colPedidos.length}
                                    </span>
                                </div>

                                {/* Cards */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                                    {colPedidos.map(pedido => (
                                        <PedidoCard
                                            key={pedido.id}
                                            pedido={pedido}
                                            onVerPedido={handleVerPedido}
                                            onVerHistorico={handleOpenHistory}
                                            onImprimir={() => printPedido(pedido, storeConfig?.nome)}
                                            onAvançar={() => handleCardAdvance(pedido)}
                                            draggable={canDragAndDrop}
                                            onDragStart={handleDragStart}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
            </div>

            {currentModalPedido && (
                <PedidoDetailsModal
                    pedido={currentModalPedido}
                    onClose={closeModal}
                    onAdvance={handleModalAdvance}
                    onCancelar={handleCancelarPedido}
                    storeName={storeConfig?.nome}
                />
            )}

            {/* Modal de Histórico do Cliente */}
            {isHistoryModalOpen && selectedClientDetail && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
                        {/* Header do Modal */}
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-primary border border-gray-100">
                                    <MessageSquare size={32} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 italic tracking-tight uppercase">
                                        {selectedClientDetail.perfil?.nome || 'Cliente'}
                                    </h2>
                                    <div className="flex items-center gap-2 text-gray-400 mt-1">
                                        <MessageCircle size={14} />
                                        <span className="text-[11px] font-black tracking-widest">{selectedClientDetail.perfil?.whatsapp}</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 custom-scrollbar">
                            
                            {/* Coluna Esquerda: Notas e Resumo */}
                            <div className="space-y-8 h-full flex flex-col">
                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="text-primary" size={20} />
                                        <h3 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Observações Permanentes</h3>
                                    </div>
                                    <div className="relative group flex-1 min-h-[200px] flex flex-col">
                                        <textarea
                                            value={selectedClientDetail.perfil?.observacoes || ''}
                                            onChange={(e) => setSelectedClientDetail({
                                                ...selectedClientDetail, 
                                                perfil: { ...selectedClientDetail.perfil, observacoes: e.target.value }
                                            })}
                                            placeholder="Ex: Cliente alérgico a glúten, prefere entrega rápida..."
                                            className="w-full flex-1 p-6 bg-gray-50 rounded-3xl border-2 border-transparent focus:border-primary/20 focus:bg-white transition-all outline-none text-gray-700 font-medium text-sm resize-none"
                                        />
                                        <button 
                                            onClick={handleSaveNotes}
                                            disabled={isSavingNotes}
                                            className="absolute bottom-4 right-4 bg-primary text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isSavingNotes ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                            {isSavingNotes ? 'Salvando...' : 'Salvar Anotações'}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100/50">
                                    <div className="flex items-center gap-2 mb-4">
                                        <AlertCircle className="text-blue-500" size={16} />
                                        <h4 className="font-black text-blue-900 text-[9px] uppercase tracking-widest">Resumo Financeiro</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                                            <p className="text-[8px] font-black text-blue-400 uppercase mb-1">Total de Pedidos</p>
                                            <p className="text-xl font-black text-blue-900 italic">{selectedClientDetail.historico?.length || 0}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                                            <p className="text-[8px] font-black text-blue-400 uppercase mb-1">Valor Total Gasto</p>
                                            <p className="text-xl font-black text-blue-900 italic">R$ {Number(selectedClientDetail.historico?.reduce((sum: number, p: any) => sum + Number(p.total), 0) || 0).toFixed(2).replace('.', ',')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Coluna Direita: Histórico de Pedidos com Scroll Independente */}
                            <div className="flex flex-col h-full overflow-hidden min-h-0 border-l border-gray-50 pl-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <Clock className="text-primary" size={20} />
                                    <h3 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Histórico de Atividade</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar" style={{maxHeight: 'calc(90vh - 200px)'}}>
                                    {selectedClientDetail.historico.length === 0 ? (
                                        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                                            <ShoppingBag className="mx-auto text-gray-200 mb-4" size={48} />
                                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nenhum pedido encontrado</p>
                                        </div>
                                    ) : (
                                        selectedClientDetail.historico.map((pedido: any) => (
                                            <div key={pedido.id} className="bg-white border border-gray-100 rounded-3xl hover:border-primary/20 transition-all group overflow-hidden shadow-sm hover:shadow-md">
                                                <div 
                                                    className="p-5 flex items-center justify-between cursor-pointer"
                                                    onClick={() => {
                                                        const el = document.getElementById(`items-k-${pedido.id}`);
                                                        if (el) el.classList.toggle('hidden');
                                                    }}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-primary/5 transition-colors text-gray-400 group-hover:text-primary">
                                                            <ShoppingBag size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[11px] font-black text-gray-900 uppercase">Pedido #{pedido.id}</p>
                                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                                                                    pedido.status === 'FINALIZADO' ? 'bg-green-100 text-green-600' : 
                                                                    pedido.status === 'CANCELADO' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                                                }`}>
                                                                    {pedido.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                                                {new Date(pedido.criado_em).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="font-black text-gray-900 text-base italic">R$ {Number(pedido.total).toFixed(2).replace('.', ',')}</p>
                                                </div>

                                                <div id={`items-k-${pedido.id}`} className="hidden bg-gray-50/50 border-t border-gray-50 p-6 flex flex-wrap gap-2">
                                                    {pedido.itens?.map((it: any, idx: number) => (
                                                        <span key={idx} className="text-[10px] font-bold text-gray-600 bg-white border border-gray-100 px-2.5 py-1 rounded-xl shadow-sm">
                                                            {it.quantidade}x {it.produto_nome}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
