import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
    ShoppingBag, ChevronLeft, Clock, MapPin, 
    CheckCircle2, AlertCircle, Loader2, ArrowRight,
    RefreshCw, Package, Truck, User
} from 'lucide-react';
import { useCustomer } from '@/context/CustomerContext';
import { useCart } from '@/context/CartContext';

interface Pedido {
    id: number;
    total: string;
    status: 'NOVO' | 'PREPARO' | 'PRONTO' | 'DESPACHADO' | 'FINALIZADO' | 'CANCELADO';
    criado_em: string;
    itens: {
        id: number;
        produto_obj: {
            nome: string;
        };
        quantidade: number;
        preco_unitario: string;
    }[];
}

const PublicOrdersPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { customer, logoutCustomer } = useCustomer();
    const { setStoreId } = useCart();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [store, setStore] = useState<any>(null);

    useEffect(() => {
        const fetchStoreData = async () => {
            try {
                const res = await fetch(`/api/lojas/${slug}/public/`);
                if (res.ok) {
                    const data = await res.json();
                    setStore(data);
                    setStoreId(data.id);
                }
            } catch (e) {
                console.error('Error fetching store:', e);
            } finally {
                setLoading(false);
            }
        };
        if (slug) fetchStoreData();
    }, [slug, setStoreId]);

    const fetchOrders = React.useCallback(async (showLoading = true) => {
        if (!customer) return;
        if (showLoading) setLoading(true);
        try {
            // Buscamos os pedidos filtrando pelo telefone
            // Removido o filtro de nome no request para evitar problemas com nomes parciais/erros
            // O backend já faz o trabalho de buscar pelo telefone dentro da loja
            const phone = customer.phone.replace(/\D/g, '');
            const url = `/api/pedidos/public-history/?phone=${phone}${store?.id ? `&loja_id=${store.id}` : ''}`;
            
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch (e) {
            console.error('Error fetching orders:', e);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [customer, store]);

    useEffect(() => {
        if (customer && (store || !slug)) {
            fetchOrders();
        } else if (!customer) {
            setLoading(false);
        }
    }, [customer, store, slug, fetchOrders]);

    // Auto-refresh logic for active orders
    useEffect(() => {
        let interval: NodeJS.Timeout;

        const hasActiveOrders = orders.some(o => !['FINALIZADO', 'CANCELADO'].includes(o.status));

        if (hasActiveOrders && customer) {
            interval = setInterval(() => {
                fetchOrders(false); // Refresh without full loading state
            }, 20000); // Every 20 seconds
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [orders, customer]);

    if (loading && !store) {
        return (
            <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    const getStatusInfo = (status: Pedido['status']) => {
        switch (status) {
            case 'NOVO': return { label: 'Novo', color: 'text-orange-600', bg: 'bg-orange-50', icon: Clock };
            case 'PREPARO': return { label: 'Em Preparo', color: 'text-blue-600', bg: 'bg-blue-50', icon: Package };
            case 'PRONTO': return { label: 'Pronto', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: CheckCircle2 };
            case 'DESPACHADO': return { label: 'Em Rota', color: 'text-purple-600', bg: 'bg-purple-50', icon: Truck };
            case 'FINALIZADO': return { label: 'Finalizado', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 };
            case 'CANCELADO': return { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle };
            default: return { label: 'Desconhecido', color: 'text-gray-600', bg: 'bg-gray-50', icon: AlertCircle };
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <button 
                        onClick={() => navigate(`/s/${slug}`)}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors py-2"
                    >
                        <ChevronLeft size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">Voltar ao Cardápio</span>
                    </button>
                    
                    <div className="flex items-center gap-4">
                        {customer && (
                            <button 
                                onClick={logoutCustomer}
                                className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                            >
                                Sair
                            </button>
                        )}
                        <h1 className="text-sm font-bold text-gray-900 border-l border-gray-200 pl-4">Meus Pedidos</h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-10">
                {!customer ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-16 text-center space-y-6">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                            <User size={40} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Acesse para ver seus pedidos</h3>
                            <p className="text-gray-400 text-sm mt-1">Identifique-se com seu nome e telefone para ver seu histórico.</p>
                        </div>
                        <button 
                            onClick={() => navigate(`/s/${slug}`)}
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gray-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-black transition-all"
                        >
                            Voltar e Identificar
                            <ArrowRight size={16} />
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Summary Header */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 leading-tight">Olá, {customer.name}!</h2>
                                <p className="text-sm text-gray-400 mt-1">Aqui você acompanha todos os seus pedidos na {store?.nome}.</p>
                            </div>
                            <button 
                                onClick={() => fetchOrders()}
                                className="inline-flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-primary transition-all pr-2"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                Atualizar lista
                            </button>
                        </div>

                        {/* Orders List */}
                        <div className="space-y-4">
                            {orders.length > 0 ? (
                                orders.map(order => {
                                    const status = getStatusInfo(order.status);
                                    const StatusIcon = status.icon;
                                    
                                    return (
                                        <div key={order.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all group">
                                            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                <div className="flex items-center gap-5">
                                                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${status.bg} ${status.color}`}>
                                                        <StatusIcon size={24} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <h4 className="font-bold text-gray-900 uppercase tracking-tight">Pedido #{order.id}</h4>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.color} border border-transparent`}>
                                                                {status.label}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {new Date(order.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between md:justify-end gap-10">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Total</p>
                                                        <p className="text-lg font-bold text-gray-900">R$ {parseFloat(order.total).toFixed(2).replace('.', ',')}</p>
                                                    </div>
                                                    <button className="p-2 text-gray-300 hover:text-primary transition-colors">
                                                        <ArrowRight size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Order Details Preview (Optional items list) */}
                                            <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-100 hidden group-hover:block transition-all animate-fade-in">
                                                <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-500">
                                                    {order.itens?.map(item => (
                                                        <span key={item.id} className="bg-white border border-gray-100 px-2 py-1 rounded">
                                                            {item.quantidade}x {item.produto_obj?.nome}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-20 text-center space-y-4 bg-white rounded-lg border border-gray-100 border-dashed">
                                    <ShoppingBag size={48} className="mx-auto text-gray-200" />
                                    <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">Você ainda não fez nenhum pedido.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* Support / Help */}
            <footer className="py-10 text-center">
                <p className="text-xs text-gray-400 font-medium">Precisando de ajuda com algum pedido?</p>
                <a href={`https://wa.me/${store?.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary mt-1 inline-block hover:underline">
                    Falar com o Restaurante
                </a>
            </footer>
        </div>
    );
};

export default PublicOrdersPage;
