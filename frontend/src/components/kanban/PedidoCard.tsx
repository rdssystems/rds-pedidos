'use client';

import React, { useEffect, useState } from 'react';

interface Pedido {
    id: number;
    cliente_nome: string;
    total: string;
    status: string;
    criado_em: string;
}

import { ArrowRight, CheckCheck } from 'lucide-react';

interface Pedido {
    id: number;
    cliente_nome: string;
    total: string;
    status: string;
    criado_em: string;
    numero_diario: number;
}

export const PedidoCard = ({ pedido, onVerPedido, onAvançar }: { pedido: Pedido, onVerPedido: (id: number) => void, onAvançar: () => any }) => {
    const [isDelayed, setIsDelayed] = useState(false);
    const [minutesElapsed, setMinutesElapsed] = useState(0);

    useEffect(() => {
        const checkDelay = () => {
            const now = new Date();
            const created = new Date(pedido.criado_em);
            const diffMs = now.getTime() - created.getTime();
            const diffMins = Math.floor(diffMs / 60000);

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
        <div className={`p-4 mb-4 rounded-[2rem] shadow-sm border transaction-all duration-300 bg-white hover:shadow-md ${isDelayed ? 'border-red-200 ring-2 ring-red-50 bg-red-50/10' : 'border-white'}`}>
            <div className="flex justify-between items-start mb-3">
                <span className="font-black text-xs px-3 py-1 bg-gray-100 rounded-full text-gray-500">#{pedido.numero_diario || pedido.id}</span>
                <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-1 rounded-full ${isDelayed ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-50 text-green-600'}`}>
                    {minutesElapsed} min
                </span>
            </div>

            <h3 className="font-bold text-gray-800 text-lg mb-1 leading-tight">{pedido.cliente_nome}</h3>
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
