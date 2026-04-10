import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useSocket } from '@/context/SocketContext';
import { ProductModal } from '@/components/menu/ProductModal';
import { CategorySidebar } from '@/components/menu/CategorySidebar';
import { PublicProductCard } from '@/components/menu/PublicProductCard';
import { PublicAuthModal } from '@/components/menu/PublicAuthModal';
import { useCustomer } from '@/context/CustomerContext';
import { 
    ShoppingBag, 
    X, 
    Clock, 
    MapPin, 
    Phone, 
    Search, 
    LogIn, 
    Minus, 
    Plus, 
    List,
    QrCode,
    ChevronRight,
    ChevronDown,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';

interface StoreData {
    id: number;
    nome: string;
    cor_primaria: string;
    cor_secundaria: string;
    logo: string;
    whatsapp: string;
    endereco: string;
    horario_funcionamento: any;
    categorias: any[];
    banner?: string;
    caixa_aberto?: boolean;
    permitir_pedido_mesa?: boolean;
    modo_catalogo_mesa?: boolean;
}

const DIAS_MAP: Record<number, string> = {
    0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab'
};

type PaymentMethod = 'DINHEIRO' | 'DEBITO' | 'CREDITO' | 'PIX';

export default function PublicTablePage() {
    const { slug, mesaNumber } = useParams();
    const { cart, addToCart, removeFromCart, updateQuantidade, total, clearCart, setStoreId } = useCart();
    const { lastMessage } = useSocket();
    const { customer, isAuthenticated } = useCustomer();
    const navigate = useNavigate();

    const [store, setStore] = useState<StoreData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [isOpenStatus, setIsOpenStatus] = useState({ open: false, label: 'Fechado' });
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<number | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    
    // Checkout State
    const [view, setView] = useState<'cart' | 'checkout'>('cart');
    const [checkoutData, setCheckoutData] = useState({
        nome: '',
        telefone: '',
        pagamento: 'PIX' as PaymentMethod,
        troco: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (customer) {
            setCheckoutData(prev => ({
                ...prev,
                nome: customer.name,
                telefone: formatTelefone(customer.phone)
            }));
        }
    }, [customer]);

    const formatTelefone = (phone: string) => {
        if (!phone) return '';
        let val = phone.replace(/\D/g, '');
        if (val.length > 11) val = val.slice(0, 11);
        
        let formatted = val;
        if (val.length > 0) {
            if (val.length <= 2) {
                formatted = `(${val}`;
            } else if (val.length <= 6) {
                formatted = `(${val.slice(0, 2)}) ${val.slice(2)}`;
            } else if (val.length <= 10) {
                formatted = `(${val.slice(0, 2)}) ${val.slice(2, 6)}-${val.slice(6)}`;
            } else {
                formatted = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
            }
        }
        return formatted;
    };

    const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatTelefone(e.target.value);
        setCheckoutData(prev => ({ ...prev, telefone: formatted }));
    };

    const checkStoreStatus = (data: StoreData) => {
        if (data && data.caixa_aberto === false) {
            setIsOpenStatus({ open: false, label: 'Caixa Fechado' });
            return;
        }

        if (!data?.horario_funcionamento) return;

        const now = new Date();
        const diaSemana = DIAS_MAP[now.getDay()];
        const horarioHoje = data.horario_funcionamento[diaSemana];

        let isOpen = false;
        const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const isTimeInRange = (open: string, close: string, current: string) => {
            if (close < open) return current >= open || current <= close;
            return current >= open && current <= close;
        };

        if (horarioHoje) {
            if (typeof horarioHoje === 'string' && horarioHoje.toLowerCase() !== 'fechado' && horarioHoje.includes('-')) {
                const [inicio, fim] = horarioHoje.split('-');
                isOpen = isTimeInRange(inicio.trim(), fim.trim(), curTime);
            } else if (typeof horarioHoje === 'object' && !horarioHoje.closed) {
                isOpen = isTimeInRange(horarioHoje.open, horarioHoje.close, curTime);
            }
        }

        setIsOpenStatus({ open: isOpen, label: isOpen ? 'Aberto' : 'Fechado' });
    };

    useEffect(() => {
        const fetchStore = async () => {
            if (!slug) return;
            try {
                const response = await fetch(`/api/lojas/${slug}/?_t=${new Date().getTime()}`);
                if (!response.ok) {
                    setStore(null);
                    setLoading(false);
                    return;
                }
                const data = await response.json();
                setStore(data);
                checkStoreStatus(data);
                if (data.id) setStoreId(data.id);
            } catch (error) {
                console.error('Error fetching store:', error);
                setStore(null);
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [slug, setStoreId]);

    useEffect(() => {
        if (!lastMessage || !store) return;

        if (lastMessage.type === 'CAIXA_UPDATE') {
            const newStatus = lastMessage.status === 'ABERTO';
            const updatedStore = { ...store, caixa_aberto: newStatus };
            setStore(updatedStore);
            checkStoreStatus(updatedStore);
        } else if (lastMessage.type === 'STOCK_UPDATE') {
            const { id, estoque_atual, disponivel } = lastMessage.message || lastMessage;
            setStore(prev => {
                if (!prev) return null;
                const updatedCategorias = prev.categorias.map(cat => ({
                    ...cat,
                    produtos: cat.produtos.map((p: any) => 
                        p.id === id ? { ...p, estoque_atual, disponivel } : p
                    )
                }));
                return { ...prev, categorias: updatedCategorias };
            });
        }
    }, [lastMessage, store]);

    const getImageUrl = (url: string | null) => {
        if (!url) return '';
        if (url.startsWith('http')) {
            try {
                const parsed = new URL(url);
                return parsed.pathname;
            } catch (e) {
                if (url.includes('/media/')) return '/media/' + url.split('/media/')[1];
            }
        }
        return url.startsWith('/') ? url : `/media/${url}`;
    };

    const formatCurrency = (val: number) => `R$ ${val.toFixed(2)}`;

    const handleSubmitOrder = async () => {
        if (!store || !mesaNumber) return;

        if (!isAuthenticated) {
            setIsAuthModalOpen(true);
            return;
        }

        if (!isOpenStatus.open) {
            alert('A loja está fechada no momento.');
            return;
        }

        // Se não houver nome, usamos o padrão da mesa
        const finalNome = checkoutData.nome.trim() || `Mesa ${mesaNumber}`;


        setIsSubmitting(true);

        try {
            const payload = {
                loja: store.id,
                cliente_nome: finalNome,
                cliente_whatsapp: checkoutData.telefone.replace(/\D/g, ''),
                endereco: `Mesa ${mesaNumber}`,
                total: total,
                taxa_entrega: 0,
                forma_pagamento: checkoutData.pagamento,
                tipo: 'MESA',
                mesa: parseInt(mesaNumber),
                itens: cart.map(item => ({
                    produto: item.productId,
                    quantidade: item.quantidade,
                    preco_unitario: item.precoBase + item.atributos.reduce((s, a) => s + a.preco, 0),
                    observacoes: '',
                    selecoes: item.atributos.map(attr => ({
                        grupo: attr.grupoNome,
                        opcao: attr.nome,
                        preco: attr.preco
                    }))
                }))
            };

            const response = await fetch('/api/pedidos/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Falha ao criar pedido');
            }

            clearCart();
            setIsCartOpen(false);
            setView('cart');
            alert('Pedido enviado com sucesso! Aguarde na mesa.');
        } catch (error) {
            console.error(error);
            alert('Erro ao enviar pedido.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCategories = store?.categorias?.map(cat => ({
        ...cat,
        produtos: cat.produtos.filter((p: any) => 
            p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(cat => cat.produtos.length > 0) || [];

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 animate-pulse font-black text-primary italic uppercase tracking-widest text-sm">Carregando Cardápio...</div>;
    
    if (!store) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
            <AlertCircle size={48} className="text-gray-300 mb-4" />
            <h1 className="text-xl font-black italic uppercase tracking-tight text-gray-900">Loja não encontrada</h1>
            <p className="text-gray-500 text-sm mt-2">Verifique o QR Code e tente novamente.</p>
        </div>
    );

    // Robust check for flags (handles boolean, string "true", or number 1)
    const perM = store.permitir_pedido_mesa === true || store.permitir_pedido_mesa as any === 'true' || store.permitir_pedido_mesa as any === 1;
    const catM = store.modo_catalogo_mesa === true || store.modo_catalogo_mesa as any === 'true' || store.modo_catalogo_mesa as any === 1;

    // Se "Permitir Pedido" estiver OFF, entramos em modo catálogo (apenas visualização)
    const isCatalogOnly = !perM || catM;

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
            {/* 1. TOP HEADER (DINING THEME) */}
            <div className="bg-white border-b border-gray-100 py-3 sticky top-0 z-[60] shadow-sm">
                <div className="max-w-[1400px] mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-lg">
                            <QrCode size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Você está na</p>
                            <p className="text-sm font-black italic uppercase tracking-tighter text-gray-900 leading-none mt-1">
                                {mesaNumber === '0' ? 'Balcão' : `Mesa ${mesaNumber}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {isAuthenticated ? (
                            <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 group cursor-pointer" onClick={() => setIsAuthModalOpen(true)}>
                                <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-primary font-bold text-[10px] border border-gray-100 uppercase">
                                    {customer?.name.charAt(0)}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 hidden sm:inline">{customer?.name.split(' ')[0]}</span>
                            </div>
                        ) : (
                            <button onClick={() => setIsAuthModalOpen(true)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">
                                <LogIn size={14} /> Identificar-se
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. STORE BANNER & INFO (COMPACT) */}
            <header className="bg-white border-b border-gray-100">
                {store.banner && (
                    <div className="h-32 w-full overflow-hidden relative">
                        <img src={getImageUrl(store.banner)} className="w-full h-full object-cover" alt="Store Banner" />
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent text-white"></div>
                    </div>
                )}
                
                <div className="max-w-[1400px] mx-auto px-6 py-6 flex items-center gap-5">
                    <img src={getImageUrl(store.logo)} className="w-20 h-20 rounded-2xl border-2 border-white shadow-xl bg-white object-cover" alt="Logo" />
                    <div>
                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900">{store.nome}</h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
                            {isOpenStatus.open ? (
                                <div className="bg-green-50 text-green-700 border border-green-100 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    Recebendo Pedidos Agora
                                </div>
                            ) : (
                                <div className="bg-red-50 text-red-700 border border-red-100 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                    Loja Fechada
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* 3. MAIN CONTENT */}
            <main className="max-w-[1400px] mx-auto w-full px-6 py-8 flex gap-8">
                
                <CategorySidebar 
                    categories={store.categorias} 
                    activeCategory={activeCategory} 
                    onCategoryClick={(id) => {
                        setActiveCategory(id);
                        document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }} 
                    accentColor={store.cor_primaria} 
                />

                <div className="flex-1 space-y-8">
                    <div className="space-y-4">
                        <div className="relative max-w-2xl">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                            <input 
                                type="text" 
                                placeholder="Buscar no cardápio..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm text-sm font-bold placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                            />
                        </div>

                        {/* Mobile Category Selector */}
                        <div className="md:hidden">
                            <div className="relative">
                                <select 
                                    value={activeCategory || ''}
                                    onChange={(e) => {
                                        const id = Number(e.target.value);
                                        setActiveCategory(id);
                                        document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    className="w-full h-12 pl-12 pr-10 bg-white border border-gray-200 rounded-2xl shadow-sm text-[10px] font-black uppercase tracking-widest text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                                >
                                    <option value="" disabled>Categorias</option>
                                    {store.categorias.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                    ))}
                                </select>
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-900 pointer-events-none">
                                    <List size={16} />
                                </div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {!isOpenStatus.open && (
                        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
                            <Clock size={20} className="text-red-500 shrink-0" />
                            <div>
                                <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Loja Fechada no momento</p>
                                <p className="text-[10px] font-bold text-red-600/60 uppercase italic">Apenas visualização do cardápio está disponível.</p>
                            </div>
                        </div>
                    )}

                    {isCatalogOnly && isOpenStatus.open && (
                        <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center gap-4">
                            <AlertCircle size={20} className="text-orange-500 shrink-0" />
                            <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest italic">Modo Visualização: Peça diretamente ao garçom.</p>
                        </div>
                    )}

                    {filteredCategories.map((cat) => (
                        <section key={cat.id} id={`cat-${cat.id}`} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <h2 className="text-xs font-black uppercase italic tracking-widest text-gray-400">{cat.nome}</h2>
                                <div className="h-px flex-1 bg-gray-100"></div>
                            </div>
                            
                            <div className="flex flex-col gap-4">
                                {cat.produtos.map((prod: any) => (
                                    <div key={prod.id} className="relative">
                                        <PublicProductCard 
                                            product={prod} 
                                            accentColor={store.cor_primaria} 
                                            onClick={() => setSelectedProduct(prod)} 
                                            getImageUrl={getImageUrl} 
                                        />
                                        {/* Overlay handle for catalog only if needed, but PublicProductCard already handles it if we pass props or manage in modal */}
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Desktop Cart Aside */}
                {!isCatalogOnly && (
                    <aside className="hidden xl:block w-80 sticky top-24 self-start max-h-[calc(100vh-120px)] flex flex-col">
                        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col h-full overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 italic">Sua Comanda</h2>
                                <div className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-black italic uppercase tracking-widest">{cart.length} itens</div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {cart.map(item => (
                                    <div key={item.id} className="bg-gray-50/50 p-4 rounded-xl border border-transparent hover:border-gray-100 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-900 text-[11px] uppercase italic tracking-tight">{item.nome}</h4>
                                            <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors"><X size={14} /></button>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 p-0.5">
                                                <button onClick={() => updateQuantidade(item.id, -1)} className="w-5 h-5 flex items-center justify-center text-gray-400"><Minus size={10} /></button>
                                                <span className="text-[10px] font-black w-4 text-center">{item.quantidade}</span>
                                                <button onClick={() => updateQuantidade(item.id, 1)} className="w-5 h-5 flex items-center justify-center text-gray-400"><Plus size={10} /></button>
                                            </div>
                                            <p className="font-black text-xs tracking-tighter text-gray-900">{formatCurrency((item.precoBase + item.atributos.reduce((s, a) => s + a.preco, 0)) * item.quantidade)}</p>
                                        </div>
                                    </div>
                                ))}
                                {cart.length === 0 && (
                                    <div className="text-center py-16 opacity-10">
                                        <ShoppingBag size={48} className="mx-auto mb-2" />
                                        <p className="font-black uppercase tracking-widest text-[10px]">Vazia</p>
                                    </div>
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="p-6 border-t border-gray-100 space-y-4">
                                    <div className="flex justify-between items-end">
                                        <span className="font-black text-[10px] uppercase tracking-widest text-gray-400">Total</span>
                                        <span className="text-2xl font-black italic tracking-tighter text-gray-900">{formatCurrency(total)}</span>
                                    </div>
                                    <button 
                                        onClick={() => setIsCartOpen(true)}
                                        className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-gray-900/10 transition-all flex items-center justify-center gap-3"
                                    >
                                        CHAMAR PEDIDO
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </aside>
                )}
            </main>

            {/* Mobile Float Button */}
            {!isCatalogOnly && cart.length > 0 && (
                <div className="xl:hidden fixed bottom-8 left-6 right-6 z-50">
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        className="w-full h-16 bg-gray-900 text-white rounded-2xl shadow-2xl flex items-center justify-between px-8"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-white/10 rounded-lg w-8 h-8 flex items-center justify-center text-[10px] font-black italic">
                                {cart.reduce((s, i) => s + i.quantidade, 0)}
                            </div>
                            <span className="font-black uppercase tracking-widest text-[10px]">Ver Comanda</span>
                        </div>
                        <span className="font-black text-lg italic tracking-tighter">{formatCurrency(total)}</span>
                    </button>
                </div>
            )}

            {/* PRODUCT MODAL */}
            {selectedProduct && (
                <ProductModal 
                    product={selectedProduct} 
                    isOpen={!!selectedProduct} 
                    onClose={() => setSelectedProduct(null)} 
                    onAddToCart={(p) => {
                        if (isCatalogOnly) {
                            alert('Apenas visualização. Chame o garçom para fazer o pedido.');
                            return;
                        }
                        addToCart(p);
                        setSelectedProduct(null);
                    }}
                    storeColor={store.cor_primaria}
                    modoCatalogo={isCatalogOnly}
                />
            )}

            {/* AUTH MODAL */}
            <PublicAuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                accentColor={store.cor_primaria} 
            />

            {/* DRAWER CART / CHECKOUT */}
            {isCartOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex justify-end">
                    <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-slide-left">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white">
                            <div>
                                <h2 className="text-xl font-black italic uppercase tracking-tighter text-gray-900">{view === 'cart' ? 'Sua Comanda' : 'Finalizar Pedido'}</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                    {view === 'cart' ? `Mesa ${mesaNumber}` : 'Confirme seus dados'}
                                </p>
                            </div>
                            <button onClick={() => { setIsCartOpen(false); setView('cart'); }} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            {view === 'cart' ? (
                                <div className="space-y-4">
                                    {cart.map(item => (
                                        <div key={item.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-black text-xs uppercase italic tracking-tight">{item.quantidade}x {item.nome}</h4>
                                                <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors"><X size={16} /></button>
                                            </div>
                                            {item.atributos.map(a => (<p key={a.opcaoId} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">• {a.nome}</p>))}
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-0.5">
                                                    <button onClick={() => updateQuantidade(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-gray-400"><Minus size={14} /></button>
                                                    <span className="text-xs font-black w-6 text-center">{item.quantidade}</span>
                                                    <button onClick={() => updateQuantidade(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-gray-400"><Plus size={14} /></button>
                                                </div>
                                                <p className="font-black text-base italic tracking-tighter text-gray-900">{formatCurrency((item.precoBase + item.atributos.reduce((s, a) => s + a.preco, 0)) * item.quantidade)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-6 animate-slide-up">
                                    <div className="bg-blue-50 p-4 rounded-2xl flex gap-4">
                                        <QrCode className="text-blue-500" size={24} />
                                        <div>
                                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Pedido na Mesa</p>
                                            <p className="text-[10px] font-bold text-blue-600 uppercase italic">O pedido será entregue na mesa {mesaNumber}.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seu Nome</label>
                                                <span className="text-[9px] font-bold text-gray-400/50 uppercase tracking-tighter">Opcional</span>
                                            </div>
                                            <input type="text" value={checkoutData.nome} onChange={(e) => setCheckoutData({ ...checkoutData, nome: e.target.value })} className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl font-bold focus:bg-white focus:border-primary transition-all text-sm" placeholder="Ex: João Silva" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">WhatsApp</label>
                                                <span className="text-[9px] font-bold text-gray-400/50 uppercase tracking-tighter">Opcional</span>
                                            </div>
                                            <input type="tel" value={checkoutData.telefone} onChange={handleTelefoneChange} className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl font-bold focus:bg-white focus:border-primary transition-all text-sm" placeholder="(DD) 99999-9999" maxLength={15} />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Forma de Pagamento</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['PIX', 'DINHEIRO', 'DEBITO', 'CREDITO'].map((method) => (
                                                <button key={method} onClick={() => setCheckoutData({ ...checkoutData, pagamento: method as PaymentMethod })} className={`p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${checkoutData.pagamento === method ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5' : 'bg-gray-50 text-gray-400 border-transparent hover:border-gray-100'}`}>
                                                    {method}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-8 border-t border-gray-100 bg-gray-50/30">
                                <div className="flex justify-between items-end mb-6">
                                    <span className="font-black text-xs uppercase tracking-widest text-gray-400">Total</span>
                                    <span className="text-3xl font-black italic tracking-tighter text-gray-900">{formatCurrency(total)}</span>
                                </div>
                                
                                {view === 'cart' ? (
                                    <button 
                                        onClick={() => setView('checkout')}
                                        className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-gray-900/20 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        Ir para o Pagamento
                                    </button>
                                ) : (
                                    <div className="space-y-4">
                                        <button 
                                            onClick={handleSubmitOrder}
                                            disabled={isSubmitting}
                                            className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            {isSubmitting ? 'Enviando...' : (
                                                <>
                                                    <CheckCircle2 size={18} />
                                                    Confirmar e Pedir
                                                </>
                                            )}
                                        </button>
                                        <button 
                                            onClick={() => setView('cart')}
                                            className="w-full text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                                        >
                                            Voltar para a comanda
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
