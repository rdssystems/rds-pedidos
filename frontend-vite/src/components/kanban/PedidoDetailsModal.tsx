'use client';

import React from 'react';
import { Play, CheckCircle2, Send, X, Phone, Printer, XCircle, ChevronRight, User } from 'lucide-react';
import { printPedido } from '@/utils/printPedido';
import { useBilling } from '@/context/BillingContext';

interface Item {
    produto_nome?: string;
    produto_obj?: { nome: string };
    nome?: string;
    quantidade: number;
    preco_unitario: string;
    observacoes?: string;
    selecoes?: Array<{ grupo: string; opcao: string; preco: number }>;
}

interface Pedido {
    id: number;
    numero_diario: number;
    cliente_nome: string;
    cliente_whatsapp: string;
    total: string;
    subtotal?: string;
    taxa?: string;
    status: string;
    endereco: string;
    forma_pagamento: string;
    tipo: string;
    itens: Item[];
    criado_em?: string;
}

interface ModalProps {
    pedido: Pedido;
    onClose: () => void;
    onAdvance: (pedidoId: number, currentStatus: string, tipo: string) => void;
    onCancelar: (pedidoId: number) => void;
    storeName?: string;
}

const STATUS_CFG: Record<string, { label: string; pill: string }> = {
    NOVO:       { label: 'Novo',      pill: 'bg-blue-50 text-blue-600 border-blue-200' },
    PREPARO:    { label: 'Preparo',   pill: 'bg-amber-50 text-amber-600 border-amber-200' },
    PRONTO:     { label: 'Pronto',    pill: 'bg-teal-50 text-teal-600 border-teal-200' },
    DESPACHADO: { label: 'Entrega',   pill: 'bg-orange-50 text-orange-600 border-orange-200' },
    FINALIZADO: { label: 'Concluído', pill: 'bg-green-50 text-green-600 border-green-200' },
    CANCELADO:  { label: 'Cancelado', pill: 'bg-red-50 text-red-600 border-red-200' },
};

const canAdvance = (status: string) => ['NOVO', 'PREPARO', 'PRONTO', 'DESPACHADO'].includes(status);

const getItemName = (item: Item): string =>
    item.produto_obj?.nome || item.produto_nome || item.nome || '—';

export const PedidoDetailsModal: React.FC<ModalProps> = ({ pedido, onClose, onAdvance, onCancelar, storeName }) => {
    const { store } = useBilling();
    const statusCfg = STATUS_CFG[pedido.status] || { label: pedido.status, pill: 'bg-gray-50 text-gray-500 border-gray-200' };

    const getAdvanceLabel = () => {
        if (store?.plano_tipo === 'START') {
            if (pedido.status === 'NOVO') return 'Preparar';
            return 'Finalizar';
        }
        
        switch (pedido.status) {
            case 'NOVO': return 'Preparar';
            case 'PREPARO': return 'Pronto';
            case 'PRONTO': return pedido.tipo === 'ENTREGA' ? 'Despachar' : 'Finalizar';
            case 'DESPACHADO': return 'Finalizar';
            default: return 'Próxima Etapa';
        }
    };

    const getAdvanceIcon = () => {
        if (pedido.status === 'NOVO') return <Play size={14} />;
        return <CheckCircle2 size={14} />;
    };

    const handlePrint = () => {
        printPedido(pedido, storeName);
    };

    const createdAt = pedido.criado_em
        ? new Date(pedido.criado_em).toLocaleString('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
          })
        : '—';

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-3xl flex flex-col bg-white rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-200 animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top accent by status */}
                <div className={`h-1 w-full shrink-0 ${
                    pedido.status === 'NOVO' ? 'bg-blue-500' :
                    pedido.status === 'PREPARO' ? 'bg-amber-500' :
                    pedido.status === 'PRONTO' ? 'bg-teal-500' :
                    pedido.status === 'DESPACHADO' ? 'bg-orange-500' :
                    pedido.status === 'FINALIZADO' ? 'bg-green-500' :
                    'bg-red-500'
                }`} />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <h2 className="font-bold text-gray-900 text-base truncate">
                            Detalhes do Pedido #{pedido.numero_diario || pedido.id}
                        </h2>
                        <span className={`shrink-0 text-[10px] font-bold border rounded-full px-2.5 py-0.5 ${statusCfg.pill}`}>
                            {statusCfg.label.toUpperCase()}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
                        className="ml-4 shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Fechar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-col md:flex-row min-h-0 flex-1">
                    {/* Left — cliente */}
                    <div className="shrink-0 md:w-52 p-5 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col items-center gap-4">
                        <p className="self-start text-[9px] font-bold text-gray-400 uppercase tracking-widest">Cliente</p>

                        <div className="w-14 h-14 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center">
                            <User size={24} className="text-gray-400" />
                        </div>

                        <div className="text-center">
                            <p className="font-bold text-gray-900 text-sm leading-snug">{pedido.cliente_nome}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{pedido.cliente_whatsapp || '—'}</p>
                        </div>

                        <a
                            href={`https://wa.me/55${pedido.cliente_whatsapp?.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors shadow-sm"
                        >
                            <Phone size={13} /> WhatsApp
                        </a>

                        <div className="w-full p-3 rounded-lg bg-white border border-gray-200">
                            <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">
                                {pedido.endereco ? 'Endereço' : 'Tipo'}
                            </p>
                            <p className="text-xs text-gray-700 leading-snug">
                                {pedido.endereco || 'Retirada na Loja'}
                            </p>
                        </div>
                    </div>

                    {/* Right — order summary */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Resumo do Pedido</p>

                            {/* Meta */}
                            <div className="grid grid-cols-3 gap-3 pb-4 mb-4 border-b border-gray-100">
                                <div>
                                    <p className="text-[9px] text-gray-400 mb-1">Tipo</p>
                                    <p className="text-sm font-semibold text-gray-800">{pedido.tipo}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-gray-400 mb-1">Pagamento</p>
                                    <p className="text-sm font-semibold text-gray-800">{pedido.forma_pagamento}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-gray-400 mb-1">Data</p>
                                    <p className="text-sm font-semibold text-gray-800">{createdAt}</p>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="divide-y divide-gray-100">
                                {(pedido.itens ?? []).map((item, idx) => (
                                    <div key={idx} className="flex items-start justify-between py-2.5 gap-4">
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <span className="shrink-0 text-xs font-bold text-[#007A87] w-6">{item.quantidade}x</span>
                                            <div className="min-w-0">
                                                <p className="text-sm text-gray-800 font-medium leading-snug">{getItemName(item)}</p>
                                                {item.selecoes && item.selecoes.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {item.selecoes.map((sel, sidx) => (
                                                            <span key={sidx} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                                                {sel.opcao}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {item.observacoes && (
                                                    <p className="text-xs text-info-700 bg-blue-50/50 p-1 rounded mt-1 italic">
                                                        "{item.observacoes}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <p className="shrink-0 text-sm font-semibold text-gray-700">R$ {item.preco_unitario}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Total */}
                            <div className="mt-4 pt-4 border-t border-gray-100 text-right">
                                <p className="text-xl font-black text-gray-900">Total: R$ {pedido.total}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Subtotal: R$ {pedido.subtotal || pedido.total}&nbsp;·&nbsp;Taxa: R$ {pedido.taxa || '0,00'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer actions */}
                <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={handlePrint}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-sm font-semibold hover:bg-gray-100 transition-colors shadow-sm"
                    >
                        <Printer size={14} /> Imprimir
                    </button>

                    <button
                        onClick={() => onCancelar(pedido.id)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-500 text-sm font-semibold hover:bg-red-100 transition-colors"
                    >
                        <XCircle size={14} /> Cancelar
                    </button>

                    {canAdvance(pedido.status) && (
                        <button
                            onClick={() => onAdvance(pedido.id, pedido.status, pedido.tipo)}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#007A87] text-white font-bold text-sm hover:bg-[#006673] transition-colors shadow-sm"
                        >
                            {getAdvanceLabel()} {getAdvanceIcon()}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
