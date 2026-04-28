import React, { useEffect, useState } from 'react';
import { X, Clock, CheckCircle, Package, Truck, ArrowRight, Phone } from 'lucide-react';

interface MeusPedidosModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: number;
    clientWhatsapp: string;
    accentColor?: string;
    liveOrderUpdates?: any; // To receive real-time updates from parent
}

interface PedidoHistory {
    id: number;
    numero_diario: number;
    criado_em: string;
    status: string;
    total: string;
    itens: any[];
}

const STATUS_ICONS: any = {
    'NOVO': <Clock size={16} className="text-blue-500" />,
    'PREPARO': <Package size={16} className="text-amber-500" />,
    'PRONTO': <CheckCircle size={16} className="text-teal-500" />,
    'DESPACHADO': <Truck size={16} className="text-orange-500" />,
    'FINALIZADO': <CheckCircle size={16} className="text-green-500" />,
    'CANCELADO': <X size={16} className="text-red-500" />
};

const STATUS_LABELS: any = {
    'NOVO': 'Aguardando',
    'PREPARO': 'Em Preparo',
    'PRONTO': 'Pronto',
    'DESPACHADO': 'Saiu para Entrega',
    'FINALIZADO': 'Concluído',
    'CANCELADO': 'Cancelado'
};

const STATUS_ORDER = ['NOVO', 'PREPARO', 'PRONTO', 'DESPACHADO', 'FINALIZADO'];

export const MeusPedidosModal: React.FC<MeusPedidosModalProps> = ({
    isOpen, onClose, storeId, clientWhatsapp, accentColor = '#007A87', liveOrderUpdates
}) => {
    const [pedidos, setPedidos] = useState<PedidoHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [phoneInput, setPhoneInput] = useState(clientWhatsapp || '');
    const [savedPhone, setSavedPhone] = useState(clientWhatsapp || localStorage.getItem('client_whatsapp') || '');

    useEffect(() => {
        if (!isOpen) return;
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        if (savedPhone) {
            fetchPedidos();
        } else {
            setLoading(false);
        }
    }, [isOpen, savedPhone]);

    useEffect(() => {
        if (liveOrderUpdates && pedidos.length > 0) {
            setPedidos(prev => {
                const index = prev.findIndex(p => p.id === liveOrderUpdates.id);
                if (index !== -1) {
                    const oldPedido = prev[index];
                    const newPedido = { ...oldPedido, ...liveOrderUpdates };
                    
                    // Trigger browser notification if status changed
                    if (oldPedido.status !== newPedido.status && 'Notification' in window && Notification.permission === 'granted') {
                        try {
                            new Notification('Atualização do seu Pedido', {
                                body: `Seu pedido #${newPedido.numero_diario || newPedido.id} mudou para: ${STATUS_LABELS[newPedido.status] || newPedido.status}`,
                                icon: '/logo-perfil.png'
                            });
                        } catch (e) {
                            console.error('Notification error', e);
                        }
                    }

                    const newPedidos = [...prev];
                    newPedidos[index] = newPedido;
                    return newPedidos;
                }
                return prev;
            });
        }
    }, [liveOrderUpdates]);

    const fetchPedidos = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/pedidos/public-history/?phone=${savedPhone.replace(/\D/g, '')}`);
            if (res.ok) {
                const data = await res.json();
                // Filter only orders for the current store, as public-history might return all orders for the phone globally
                const filtered = data.filter((p: any) => p.loja === storeId);
                setPedidos(filtered);
            }
        } catch (e) {
            console.error("Failed to fetch orders", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePhone = () => {
        const cleanPhone = phoneInput.replace(/\D/g, '');
        if (cleanPhone.length >= 10) {
            localStorage.setItem('client_whatsapp', cleanPhone);
            setSavedPhone(cleanPhone);
        } else {
            alert('Por favor, digite um número de WhatsApp válido.');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 shadow-inner z-[100] flex justify-end overflow-hidden transition-all">
            <div className="bg-white w-full max-w-lg h-screen shadow-2xl flex flex-col md:rounded-l-3xl overflow-hidden animate-slide-left relative">
                
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                    <div>
                        <h2 className="text-xl font-bold uppercase tracking-widest text-gray-900 leading-none">Meus Pedidos</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                            Acompanhe o status em tempo real
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 custom-scrollbar bg-gray-50/50">
                    
                    {!savedPhone ? (
                        <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center space-y-6">
                            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                                <Phone size={32} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Qual o seu número?</h3>
                                <p className="text-sm text-gray-500 mt-2">Para ver seus pedidos, precisamos do número de WhatsApp que você usou na compra.</p>
                            </div>
                            <div className="w-full space-y-3">
                                <input 
                                    type="tel" 
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    placeholder="Ex: 11999999999"
                                    className="w-full bg-white border border-gray-200 p-4 rounded-lg font-medium focus:outline-none focus:border-primary transition-colors text-center"
                                />
                                <button 
                                    onClick={handleSavePhone}
                                    className="w-full py-4 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-md transition-all"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    Ver Meus Pedidos
                                </button>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin"></div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Buscando...</p>
                        </div>
                    ) : pedidos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center space-y-4 opacity-50">
                            <Package size={48} className="text-gray-400" />
                            <h3 className="font-bold text-lg text-gray-900">Nenhum pedido encontrado</h3>
                            <p className="text-sm text-gray-500">Você ainda não fez nenhum pedido com o número {savedPhone}.</p>
                            <button 
                                onClick={() => { localStorage.removeItem('client_whatsapp'); setSavedPhone(''); }}
                                className="text-xs font-bold uppercase tracking-widest mt-4 underline text-gray-500"
                            >
                                Trocar Número
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-500">
                                <span>{pedidos.length} pedidos encontrados</span>
                                <button onClick={() => { localStorage.removeItem('client_whatsapp'); setSavedPhone(''); }} className="underline">Trocar</button>
                            </div>

                            {pedidos.map(pedido => (
                                <div key={pedido.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {formatDate(pedido.criado_em)}
                                            </span>
                                            <h4 className="font-black text-gray-900 leading-tight flex items-center gap-2">
                                                Pedido #{pedido.numero_diario || pedido.id}
                                            </h4>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Total</span>
                                            <span className="font-black text-gray-900">R$ {pedido.total}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="p-5">
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shadow-sm border border-gray-100">
                                                {STATUS_ICONS[pedido.status] || <Clock size={16} className="text-gray-400" />}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Status Atual</p>
                                                <p className="font-bold text-sm text-gray-900">{STATUS_LABELS[pedido.status] || pedido.status}</p>
                                            </div>
                                        </div>

                                        {/* Status Timeline (only if not cancelled) */}
                                        {pedido.status !== 'CANCELADO' && (
                                            <div className="relative flex justify-between items-center mb-8 px-2 mt-4">
                                                {/* Linha conectora de fundo */}
                                                <div className="absolute top-1/2 left-2 right-2 h-[3px] bg-gray-100 -z-10 -translate-y-1/2 rounded-full overflow-hidden">
                                                    {/* Linha preenchida (progresso) */}
                                                    <div className="h-full transition-all duration-700 ease-out" 
                                                        style={{ 
                                                            width: `${(STATUS_ORDER.indexOf(pedido.status) / (STATUS_ORDER.length - 1)) * 100}%`,
                                                            backgroundColor: pedido.status === 'FINALIZADO' ? '#22C55E' : '#3B82F6'
                                                        }}>
                                                    </div>
                                                </div>
                                                
                                                {STATUS_ORDER.map((s, idx) => {
                                                    const currentIndex = STATUS_ORDER.indexOf(pedido.status);
                                                    const isCompleted = currentIndex >= idx;
                                                    const isCurrent = currentIndex === idx;
                                                    
                                                    const stepColor = s === 'FINALIZADO' ? '#22C55E' : '#3B82F6';
                                                    // If the whole order is finished, we can make all previous dots green or keep them their native step color. 
                                                    // Making all completed dots match the current progress color looks more cohesive.
                                                    const activeColor = pedido.status === 'FINALIZADO' ? '#22C55E' : '#3B82F6';
                                                    
                                                    return (
                                                        <div key={s} className="flex flex-col items-center gap-1.5 relative group">
                                                            <div className={`w-[18px] h-[18px] rounded-full transition-all duration-500 shadow-sm z-10 flex items-center justify-center relative ${
                                                                isCurrent ? 'bg-white scale-125 border-[4px]' : 
                                                                isCompleted ? 'bg-current border-current border-2' : 'bg-white border-2 border-gray-200'
                                                            }`} style={{ 
                                                                borderColor: isCompleted || isCurrent ? activeColor : undefined, 
                                                                backgroundColor: isCompleted && !isCurrent ? activeColor : undefined 
                                                            }}>
                                                                {isCurrent && (
                                                                    <div className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ backgroundColor: activeColor }}></div>
                                                                )}
                                                            </div>
                                                            {/* Legenda do step */}
                                                            <div className={`absolute -bottom-6 text-[9px] font-black uppercase tracking-widest whitespace-nowrap z-20 pointer-events-none transition-all ${
                                                                isCurrent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
                                                            }`} style={{ color: isCurrent ? activeColor : '#9CA3AF' }}>
                                                                {STATUS_LABELS[s]}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        <div className="space-y-1.5 bg-gray-50 rounded-lg p-3">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Itens do Pedido</p>
                                            {pedido.itens?.map((item: any) => (
                                                <p key={item.id} className="text-xs text-gray-700 font-medium">
                                                    <span className="font-bold text-gray-900">{item.quantidade}x</span> {item.produto_nome || item.produto?.nome}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
