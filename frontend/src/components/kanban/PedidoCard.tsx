'use client';

import React, { useEffect, useState } from 'react';

interface Pedido {
    id: number;
    cliente_nome: string;
    total: string;
    status: string;
    criado_em: string;
    numero_diario: number;
    tipo: string;
}

import { ArrowRight, CheckCheck } from 'lucide-react';

interface PedidoCardProps {
    pedido: Pedido;
    onVerPedido: (id: number) => void;
    onAvançar: () => any;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent<HTMLDivElement>, id: number) => void;
}

export const PedidoCard: React.FC<PedidoCardProps> = ({ pedido, onVerPedido, onAvançar, draggable, onDragStart }) => {
    const [isDelayed, setIsDelayed] = useState(false);
    const [minutesElapsed, setMinutesElapsed] = useState(0);

    useEffect(() => {
        const checkDelay = () => {
            const now = new Date();
            const created = new Date(pedido.criado_em);
            if (isNaN(created.getTime())) {
                setMinutesElapsed(0);
                return;
            }

            const diffMs = now.getTime() - created.getTime();
            const diffMins = Math.max(0, Math.floor(diffMs / 60000));

            setMinutesElapsed(diffMins);
            if (pedido.status === 'NOVO' && diffMins >= 5) {
                setIsDelayed(true);
            } else {
                setIsDelayed(false);
            }
        };

        checkDelay();
        const interval = setInterval(checkDelay, 30000); // Check every 30s

        return () => clearInterval(interval);
    }, [pedido]);

    const getNextStatusLabel = () => {
        switch (pedido.status) {
            case 'NOVO': return 'Preparar';
            case 'PREPARO': return 'Pronto';
            case 'PRONTO': return 'Despachar';
            case 'DESPACHADO': return 'Finalizar';
            default: return null;
        }
    };

    const nextLabel = getNextStatusLabel();

    return (
        <div
            draggable={draggable}
            onDragStart={(e) => onDragStart && onDragStart(e, pedido.id)}
            className={`p-4 mb-4 rounded-[2rem] shadow-sm border transaction-all duration-300 bg-white hover:shadow-md ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${isDelayed ? 'border-red-200 ring-2 ring-red-50 bg-red-50/10' : 'border-white'}`}
        >
            <div className="flex justify-between items-start mb-3">
                <span className="font-black text-xs px-3 py-1 bg-gray-100 rounded-full text-gray-500">#{pedido.numero_diario || pedido.id}</span>
                <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-1 rounded-full ${isDelayed ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-50 text-green-600'}`}>
                    {minutesElapsed} min
                </span>
            </div>

            <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-800 text-lg leading-tight truncate">{pedido.cliente_nome}</h3>
                {pedido.tipo === 'ENTREGA' && <span className="text-[8px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase shrink-0">Entrega</span>}
                {pedido.tipo === 'BALCAO' && <span className="text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-black uppercase shrink-0">Balcão</span>}
                {pedido.tipo === 'RETIRADA' && <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase shrink-0">Retirada</span>}
                {pedido.tipo === 'MESA' && <span className="text-[8px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-black uppercase shrink-0">Mesa</span>}
            </div>
            <p className="text-sm font-black text-gray-400 mb-4">R$ {pedido.total}</p>

            <div className="flex gap-2">
                <button
                    onClick={() => onVerPedido(pedido.id)}
                    className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors text-xs font-black uppercase tracking-wider"
                >
                    Ver
                </button>

                {nextLabel && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAvançar(); }}
                        className={`px-4 py-3 rounded-xl transition-all flex items-center justify-center shadow-lg active:scale-95 ${pedido.status === 'DESPACHADO'
                            ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-200'
                            : pedido.status === 'PRONTO'
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
                        title={nextLabel}
                    >
                        {pedido.status === 'DESPACHADO' ? <CheckCheck size={18} /> : <ArrowRight size={18} />}
                    </button>
                )}
            </div>
        </div>
    );
};
