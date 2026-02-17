import React from 'react';
import { X, Phone, MapPin, CreditCard, Clock, CheckCircle, ChevronRight, AlertCircle, ShoppingBag } from 'lucide-react';

interface ProdutoObj {
    nome: string;
    preco: string;
    descricao: string;
}

interface Item {
    id: number;
    quantidade: number;
    produto_obj?: ProdutoObj;
    preco_unitario: string;
    selecoes: any[];
    observacoes: string;
}

interface Pedido {
    id: number;
    numero_diario: number;
    cliente_nome: string;
    cliente_whatsapp: string;
    endereco: string;
    forma_pagamento: string;
    total: string;
    status: string;
    criado_em: string;
    itens: Item[];
}

interface PedidoDetailsModalProps {
    pedido: Pedido | null;
    onClose: () => void;
    onStatusChange: (status: string) => void;
}

export const PedidoDetailsModal = ({ pedido, onClose, onStatusChange }: PedidoDetailsModalProps) => {
    if (!pedido) return null;

    const STATUS_LABELS: Record<string, string> = {
        'NOVO': 'Novo Pedido',
        'PREPARO': 'Em Preparo',
        'PRONTO': 'Pronto para Entrega',
        'DESPACHADO': 'Saiu para Entrega',
        'FINALIZADO': 'Entregue',
        'CANCELADO': 'Cancelado'
    };

    const STATUS_COLORS: Record<string, string> = {
        'NOVO': 'bg-blue-100 text-blue-700',
        'PREPARO': 'bg-yellow-100 text-yellow-700',
        'PRONTO': 'bg-indigo-100 text-indigo-700',
        'DESPACHADO': 'bg-orange-100 text-orange-700',
        'FINALIZADO': 'bg-green-100 text-green-700',
        'CANCELADO': 'bg-red-100 text-red-700'
    };

    // Calculate time elapsed
    const created = new Date(pedido.criado_em);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - created.getTime()) / 60000);
    const timeString = diffMins > 60 ? `${Math.floor(diffMins / 60)}h ${diffMins % 60}m` : `${diffMins} min`;

    const handleNextStatus = () => {
        const flow = ['NOVO', 'PREPARO', 'PRONTO', 'DESPACHADO', 'FINALIZADO'];
        const currentIdx = flow.indexOf(pedido.status);
        if (currentIdx !== -1 && currentIdx < flow.length - 1) {
            onStatusChange(flow[currentIdx + 1]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col animate-slide-up overflow-hidden ring-1 ring-gray-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b flex justify-between items-start bg-gray-50/50">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-lg">
                                #{pedido.numero_diario || pedido.id}
                            </div>
                            <span className={`text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm ${STATUS_COLORS[pedido.status] || 'bg-gray-100 text-gray-500'}`}>
                                {STATUS_LABELS[pedido.status] || pedido.status}
                            </span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 pl-1">
                            Recebido há {timeString}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors group">
                        <X size={24} className="text-gray-400 group-hover:text-gray-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

                    {/* Customer & Payment Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Customer */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} /> Cliente
                            </h3>
                            <div className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <p className="font-bold text-lg text-gray-900 leading-tight">{pedido.cliente_nome}</p>
                                <a
                                    href={`https://wa.me/${pedido.cliente_whatsapp}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-green-600 text-sm font-bold hover:underline mt-2 bg-green-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <Phone size={14} /> {pedido.cliente_whatsapp}
                                </a>
                            </div>
                        </div>

                        {/* Payment */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <CreditCard size={12} /> Pagamento
                            </h3>
                            <div className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-center">
                                <p className="font-black text-lg text-gray-800 uppercase tracking-tight">{pedido.forma_pagamento}</p>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="text-xs text-gray-400 font-bold uppercase">Total</span>
                                    <span className="text-xl font-black text-gray-900">R$ {pedido.total}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <MapPin size={12} /> Endereço de Entrega
                        </h3>
                        <div className="bg-blue-50/50 p-5 rounded-[1.5rem] border border-blue-100 text-blue-900 font-bold relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <MapPin size={48} />
                            </div>
                            <p className="leading-relaxed relative z-10">{pedido.endereco}</p>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <ShoppingBag size={12} /> Itens do Pedido
                            </h3>
                            <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-md text-gray-500">{pedido.itens.length} itens</span>
                        </div>

                        <div className="space-y-4">
                            {pedido.itens.map((item, idx) => (
                                <div key={idx} className="flex gap-5 p-5 rounded-[1.5rem] border border-gray-100 bg-white shadow-sm hover:border-gray-200 transition-colors">
                                    <div className="bg-gray-50 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-gray-400 border border-gray-100 text-lg shadow-inner">
                                        {item.quantidade}x
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="font-bold text-gray-900 text-lg leading-tight">
                                            {item.produto_obj?.nome || `Produto #${item.id}`}
                                        </p>

                                        {item.selecoes && item.selecoes.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {item.selecoes.map((sel: any, i: number) => (
                                                    <span key={i} className="text-[11px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                                        {sel.opcao}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {item.observacoes && (
                                            <div className="flex items-start gap-2 mt-2 text-amber-600 bg-amber-50 p-2 rounded-lg text-xs font-bold border border-amber-100">
                                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                                <span>Obs: {item.observacoes}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="font-black text-gray-900 text-lg">
                                        R$ {item.preco_unitario}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-gray-50/80 backdrop-blur border-t flex justify-end gap-4">
                    <button
                        onClick={() => {
                            if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
                                onStatusChange('CANCELADO');
                            }
                        }}
                        className="px-6 py-4 rounded-2xl font-black text-red-500 text-xs hover:bg-red-50 transition-colors uppercase tracking-widest"
                    >
                        Cancelar Pedido
                    </button>

                    {pedido.status !== 'FINALIZADO' && pedido.status !== 'CANCELADO' && (
                        <button
                            onClick={handleNextStatus}
                            className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 group"
                        >
                            <span>Avançar para {STATUS_LABELS[['NOVO', 'PREPARO', 'PRONTO', 'DESPACHADO', 'FINALIZADO'][['NOVO', 'PREPARO', 'PRONTO', 'DESPACHADO', 'FINALIZADO'].indexOf(pedido.status) + 1]]}</span>
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
