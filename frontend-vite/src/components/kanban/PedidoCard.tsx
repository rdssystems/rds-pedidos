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

const STATUS_CFG: Record<string, { label: string; dot: string; pill: string; accent: string }> = {
    NOVO:       { label: 'Novo',      dot: 'bg-blue-500',   pill: 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm', accent: 'from-blue-500 to-blue-400' },
    PREPARO:    { label: 'Preparo',   dot: 'bg-amber-500',  pill: 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm', accent: 'from-amber-500 to-amber-400' },
    PRONTO:     { label: 'Pronto',    dot: 'bg-teal-500',   pill: 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm', accent: 'from-teal-500 to-teal-400' },
    DESPACHADO: { label: 'Entrega',   dot: 'bg-orange-500', pill: 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm', accent: 'from-orange-500 to-orange-400' },
    FINALIZADO: { label: 'Concluído', dot: 'bg-green-500',  pill: 'bg-green-50 text-green-700 border-green-200 shadow-sm', accent: 'from-green-500 to-green-400' },
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
    const statusCfg = STATUS_CFG[pedido.status] || { label: pedido.status, dot: 'bg-gray-400', pill: 'bg-gray-50 text-gray-600 border-gray-200 shadow-sm', accent: 'from-gray-400 to-gray-300' };
    const delayText = minutesElapsed >= 60 ? `${(minutesElapsed / 60).toFixed(1)}h` : `${minutesElapsed}m`;

    return (
        <div
            draggable={draggable}
            onDragStart={e => onDragStart && onDragStart(e, pedido.id)}
            className={`group relative bg-white rounded-xl border transition-all duration-300 hover:-translate-y-1 ${
                isDelayed
                    ? 'border-red-200 shadow-[0_4px_16px_rgba(239,68,68,0.12)] hover:shadow-[0_8px_24px_rgba(239,68,68,0.2)]'
                    : 'border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]'
            } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            {/* Top gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r ${statusCfg.accent}`} />

            <div className="p-3 pt-3.5 flex flex-col h-full">
                {/* Header Row: ID, Tipo e Pagamento (Esquerda) | Status Pill (Direita) */}
                <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                        <span className="text-[11px] font-black text-gray-400 tracking-wider">
                            #{pedido.numero_diario || pedido.id}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0"></span>
                        <span className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0">
                            {pedido.tipo}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium truncate">
                            {pedido.forma_pagamento}
                        </span>
                    </div>
                    <span className={`text-[9px] font-bold border rounded-md px-1.5 py-0.5 uppercase tracking-wide flex-shrink-0 ${statusCfg.pill}`}>
                        {statusCfg.label}
                    </span>
                </div>

                {/* Main Row: Nome do Cliente e Histórico (Esquerda) | Valor e Atraso (Direita) */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                        <p className="font-extrabold text-gray-900 text-sm leading-tight truncate">
                            {pedido.cliente_nome}
                        </p>
                        {pedido.cliente_whatsapp && onVerHistorico && store?.plano_tipo !== 'START' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onVerHistorico(pedido.cliente_whatsapp || ''); }}
                                className="p-1 text-orange-400 hover:text-white hover:bg-orange-500 rounded-md transition-colors flex-shrink-0"
                                title="Ver histórico e notas"
                            >
                                <HistoryIcon size={14} />
                            </button>
                        )}
                    </div>
                    
                    <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-sm font-black text-gray-900 tracking-tight leading-none">
                            R$ {pedido.total}
                        </span>
                        {isDelayed && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-600 bg-red-50 px-1 mt-1 rounded border border-red-100 animate-pulse">
                                <Clock size={8} /> {delayText}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 mt-auto">
                    <button
                        onClick={e => { e.stopPropagation(); onVerPedido(pedido.id); }}
                        className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 text-xs font-bold transition-all shadow-sm hover:shadow"
                        title="Ver detalhes"
                    >
                        <Eye size={14} />
                    </button>

                    <button
                        onClick={e => { e.stopPropagation(); onImprimir(); }}
                        className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-[#007A87] hover:border-[#007A87]/30 hover:bg-[#007A87]/5 transition-all shadow-sm hover:shadow"
                        title="Imprimir comanda"
                    >
                        <Printer size={14} />
                    </button>

                    {nextLabel && (
                        <button
                            onClick={e => { e.stopPropagation(); onAvançar(); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#007A87] text-white text-[11px] font-bold hover:bg-[#006673] transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 group/btn"
                        >
                            {nextLabel}
                            {pedido.status === 'DESPACHADO' ? (
                                <CheckCheck size={14} className="transition-transform group-hover/btn:scale-110" />
                            ) : (
                                <ArrowRight size={14} className="transition-transform group-hover/btn:translate-x-1" />
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
