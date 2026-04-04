'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCheck, Clock, Eye, Printer, History as HistoryIcon } from 'lucide-react';

import { useBilling } from '@/context/BillingContext';

interface Pedido {
    id: number;
    cliente_nome: string;
    cliente_whatsapp?: string; // Adicionado para o histórico
    total: string;
    status: string;
    criado_em: string;
    numero_diario: number;
    tipo: string;
    forma_pagamento: string;
}

interface PedidoCardProps {
    pedido: Pedido;
    onVerPedido: (id: number) => void;
    onVerHistorico?: (whatsapp: string) => void; // Nova função
    onImprimir: () => void;
    onAvançar: () => any;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent<HTMLDivElement>, id: number) => void;
}

const STATUS_CFG: Record<string, { label: string; dot: string; pill: string }> = {
    NOVO:       { label: 'Novo',      dot: 'bg-blue-500',   pill: 'bg-blue-50 text-blue-600 border-blue-200' },
    PREPARO:    { label: 'Preparo',   dot: 'bg-amber-500',  pill: 'bg-amber-50 text-amber-600 border-amber-200' },
    PRONTO:     { label: 'Pronto',    dot: 'bg-teal-500',   pill: 'bg-teal-50 text-teal-600 border-teal-200' },
    DESPACHADO: { label: 'Entrega',   dot: 'bg-orange-500', pill: 'bg-orange-50 text-orange-600 border-orange-200' },
    FINALIZADO: { label: 'Concluído', dot: 'bg-green-500',  pill: 'bg-green-50 text-green-600 border-green-200' },
};

export const PedidoCard: React.FC<PedidoCardProps> = ({
    pedido, onVerPedido, onVerHistorico, onImprimir, onAvançar, draggable, onDragStart,
}) => {
    const { store } = useBilling();
    const [isDelayed, setIsDelayed] = useState(false);
    const [minutesElapsed, setMinutesElapsed] = useState(0);

    useEffect(() => {
        const check = () => {
            const now = new Date();
            const created = new Date(pedido.criado_em);
            if (isNaN(created.getTime())) return;
            const mins = Math.max(0, Math.floor((now.getTime() - created.getTime()) / 60000));
            setMinutesElapsed(mins);
            setIsDelayed(pedido.status !== 'FINALIZADO' && mins >= 30);
        };
        check();
        const t = setInterval(check, 30000);
        return () => clearInterval(t);
    }, [pedido]);

    const getNextLabel = () => {
        switch (pedido.status) {
            case 'NOVO': return 'Preparar';
            case 'PREPARO': return 'Pronto';
            case 'PRONTO': return pedido.tipo !== 'ENTREGA' ? 'Finalizar' : 'Despachar';
            case 'DESPACHADO': return 'Finalizar';
            default: return null;
        }
    };

    const nextLabel = getNextLabel();
    const statusCfg = STATUS_CFG[pedido.status] || { label: pedido.status, dot: 'bg-gray-400', pill: 'bg-gray-50 text-gray-500 border-gray-200' };
    const delayText = minutesElapsed >= 60 ? `${(minutesElapsed / 60).toFixed(1)}h` : `${minutesElapsed}m`;

    return (
        <div
            draggable={draggable}
            onDragStart={e => onDragStart && onDragStart(e, pedido.id)}
            className={`bg-white rounded-lg border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                isDelayed
                    ? 'border-red-300 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]'
                    : 'border-gray-200 shadow-sm'
            } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            {/* Thin top accent bar by status */}
            <div className={`h-0.5 w-full rounded-t-lg ${statusCfg.dot}`} />

            <div className="p-3">
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 tracking-wider">
                        #{pedido.numero_diario || pedido.id}
                    </span>
                    <span className={`text-[9px] font-bold border rounded-full px-2 py-0.5 ${statusCfg.pill}`}>
                        {statusCfg.label}
                    </span>
                </div>

                {/* Nome do Cliente + Ícone de Histórico */}
                <div className="flex items-center justify-between mb-0.5">
                    <p className="font-bold text-gray-900 text-sm leading-tight truncate">
                        {pedido.cliente_nome}
                    </p>
                    {pedido.cliente_whatsapp && onVerHistorico && store?.plano_tipo !== 'START' && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onVerHistorico(pedido.cliente_whatsapp || ''); }}
                            className="p-1.5 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                            title="Ver histórico e notas"
                        >
                            <HistoryIcon size={18} />
                        </button>
                    )}
                </div>
                <p className="text-[11px] text-gray-400 mb-3">
                    {pedido.tipo} · {pedido.forma_pagamento}
                </p>

                {/* Price + delay badge */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-black text-gray-900">
                        R$ {pedido.total}
                    </span>
                    {isDelayed && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">
                            <Clock size={9} /> {delayText}
                        </span>
                    )}
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-100 mb-3" />

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={e => { e.stopPropagation(); onVerPedido(pedido.id); }}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 text-xs font-semibold transition-colors flex-1 sm:flex-none"
                        title="Ver detalhes"
                    >
                        <Eye size={12} /> <span className="hidden sm:inline">Ver</span>
                    </button>

                    <button
                        onClick={e => { e.stopPropagation(); onImprimir(); }}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-primary hover:border-primary/30 transition-all flex-1"
                        title="Imprimir comanda"
                    >
                        <Printer size={12} />
                    </button>


                    {nextLabel && (
                        <button
                            onClick={e => { e.stopPropagation(); onAvançar(); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#007A87] text-white text-xs font-bold hover:bg-[#006673] transition-colors shadow-sm"
                        >
                            {nextLabel}
                            {pedido.status === 'DESPACHADO' ? <CheckCheck size={12} /> : <ArrowRight size={12} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
