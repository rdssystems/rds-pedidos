import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import { ProductModal } from '@/components/menu/ProductModal';
import { CategorySidebar } from '@/components/menu/CategorySidebar';
import { PublicProductCard } from '@/components/menu/PublicProductCard';
import { PublicAuthModal } from '@/components/menu/PublicAuthModal';
import { useCustomer } from '@/context/CustomerContext';
import { ShoppingBag, ChevronRight, X, Clock, MapPin, Phone, Search, User as UserIcon, LogIn, ChevronDown, Minus, Plus, List } from 'lucide-react';

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
    tipo_taxa_entrega?: 'FIXA' | 'BAIRRO';
    taxa_entrega_fixa?: string;
    bairros_entrega?: { id: number, nome: string, taxa: string, ativo: boolean }[];
    modo_catalogo?: boolean;
    caixa_aberto?: boolean;
}

const DIAS_MAP: Record<number, string> = {
    0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab'
};

type PaymentMethod = 'DINHEIRO' | 'DEBITO' | 'CREDITO' | 'PIX';
type DeliveryMethod = 'ENTREGA' | 'RETIRADA';

export default function PublicMenuPage() {
    const { slug } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { cart, addToCart, removeFromCart, updateQuantidade, total, clearCart, setStoreId } = useCart();
    const { lastMessage } = useSocket();

    const [store, setStore] = useState<StoreData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [isOpenStatus, setIsOpenStatus] = useState({ open: false, label: 'Fechado' });
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<number | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false); // For mobile sidebar
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const { customer, isAuthenticated } = useCustomer();

    // Checkout State
    const [view, setView] = useState<'cart' | 'checkout'>('cart');
    const [checkoutData, setCheckoutData] = useState({
        nome: '',
        telefone: '',
        endereco_rua: '',
        endereco_numero: '',
        endereco_bairro: '',
        pagamento: 'PIX' as PaymentMethod,
        metodo_entrega: 'ENTREGA' as DeliveryMethod,
        troco: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (customer) {
            setCheckoutData(prev => ({
                ...prev,
                nome: customer.name,
                telefone: customer.phone,
                endereco_rua: customer.address_rua || prev.endereco_rua,
                endereco_numero: customer.address_numero || prev.endereco_numero,
                endereco_bairro: customer.address_bairro || prev.endereco_bairro
            }));
        }
    }, [customer]);

    const deliveryFee = React.useMemo(() => {
        if (!store || checkoutData.metodo_entrega !== 'ENTREGA') return 0;

        if (store.tipo_taxa_entrega === 'BAIRRO') {
            if (!store.bairros_entrega) return 0;
            const bairroSelecionado = store.bairros_entrega.find(b => b.nome === checkoutData.endereco_bairro);
            return bairroSelecionado ? parseFloat(bairroSelecionado.taxa) : 0;
        }

        return parseFloat(store.taxa_entrega_fixa || '0');
    }, [store, checkoutData.metodo_entrega, checkoutData.endereco_bairro]);

    const grandTotal = total + deliveryFee;

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
            if (close < open) {
                return current >= open || current <= close;
            }
            return current >= open && current <= close;
        };

        if (horarioHoje) {
            if (typeof horarioHoje === 'string') {
                if (horarioHoje.toLowerCase() !== 'fechado' && horarioHoje.includes('-')) {
                    const [inicio, fim] = horarioHoje.split('-');
                    isOpen = isTimeInRange(inicio.trim(), fim.trim(), curTime);
                }
            } else if (typeof horarioHoje === 'object' && !horarioHoje.closed) {
                isOpen = isTimeInRange(horarioHoje.open, horarioHoje.close, curTime);
            }
        }

        if (!isOpen) {
            const yesterdayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
            const diaOntem = DIAS_MAP[yesterdayIndex];
            const horarioOntem = data.horario_funcionamento[diaOntem];

            if (horarioOntem && typeof horarioOntem === 'object' && !horarioOntem.closed) {
                if (horarioOntem.close < horarioOntem.open) {
                    if (curTime <= horarioOntem.close) isOpen = true;
                }
            }
        }

        setIsOpenStatus({ open: isOpen, label: isOpen ? 'Aberto' : 'Fechado' });
    };

    useEffect(() => {
        const fetchStore = async () => {
            if (!slug) return;
            const currentSlug = Array.isArray(slug) ? slug[0] : slug;

            try {
                const response = await fetch(`/api/lojas/${currentSlug}/?_t=${new Date().getTime()}`, {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });

                if (!response.ok) {
                    setStore(null);
                    setLoading(false);
                    return;
                }
                const data = await response.json();
                setStore(data);
                checkStoreStatus(data);

                if (data.id) {
                    localStorage.setItem('activeStoreId', data.id.toString());
                    setStoreId(data.id);
                }
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
        if (!store) return;
        const interval = setInterval(() => checkStoreStatus(store), 60000);
        return () => clearInterval(interval);
    }, [store]);

    useEffect(() => {
        if (lastMessage && lastMessage.type === 'CAIXA_UPDATE' && store) {
            const newStatus = lastMessage.status === 'ABERTO';
            const updatedStore = { ...store, caixa_aberto: newStatus };
            setStore(updatedStore);
            checkStoreStatus(updatedStore);
        }
    }, [lastMessage, store]);

    const getImageUrl = (url: string | null) => {
        if (!url) return '';
        
        // Se a busca encontrar um padrão de URL (http ou https)
        if (url.startsWith('http')) {
            // Removemos qualquer domínio, sobrando apenas o caminho (/media/...)
            try {
                const parsed = new URL(url);
                return parsed.pathname;
            } catch (e) {
                // Fallback se falhar o parse
                if (url.includes('/media/')) {
                    return '/media/' + url.split('/media/')[1];
                }
            }
        }
        
        // Garante que o caminho comece com barra
        if (!url.startsWith('/') && !url.startsWith('http')) {
            return `/media/${url}`;
        }
        
        return url;
    };

    const formatCurrency = (val: number) => `R$ ${val.toFixed(2)}`;

    const formatWhatsappNumber = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length >= 10 && cleaned.length <= 11) {
            return `55${cleaned}`;
        }
        return cleaned;
    };

    const handleSubmitOrder = async () => {
        if (!store) return;

        // AUTH CHECK - Guest Login
        if (!isAuthenticated) {
            setIsAuthModalOpen(true);
            return;
        }

        if (!isOpenStatus.open) {
            alert('A loja está fechada no momento. Confira o horário de funcionamento.');
            return;
        }

        const cleanPhone = checkoutData.telefone.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
            alert('Por favor, informe um número de Whatsapp válido (10 ou 11 dígitos, ex: 11999999999).');
            return;
        }

        if (!checkoutData.nome || !checkoutData.telefone) {
            alert('Por favor, preencha seu Nome e Whatsapp.');
            return;
        }

        if (checkoutData.metodo_entrega === 'ENTREGA' && (!checkoutData.endereco_rua || !checkoutData.endereco_numero || !checkoutData.endereco_bairro)) {
            alert('Para receber em casa, por favor, preencha o Endereço completo.');
            return;
        }

        if (checkoutData.pagamento === 'DINHEIRO' && checkoutData.troco) {
            const trocoValor = parseFloat(checkoutData.troco.replace('R$', '').replace('.', '').replace(',', '.').trim());
            if (isNaN(trocoValor)) {
                alert('Valor de troco inválido.');
                return;
            }
            if (trocoValor < grandTotal) {
                alert(`O valor para troco (${formatCurrency(trocoValor)}) não pode ser menor que o total do pedido (${formatCurrency(grandTotal)}).`);
                return;
            }
        }

        const fullAddress = checkoutData.metodo_entrega === 'ENTREGA'
            ? `${checkoutData.endereco_rua}, ${checkoutData.endereco_numero} - ${checkoutData.endereco_bairro}`
            : 'Retirada na Loja';

        setIsSubmitting(true);

        try {
            const payload = {
                loja: store.id,
                cliente_nome: checkoutData.nome,
                cliente_whatsapp: checkoutData.telefone,
                endereco: fullAddress,
                total: grandTotal,
                taxa_entrega: deliveryFee,
                forma_pagamento: checkoutData.pagamento,
                tipo: checkoutData.metodo_entrega,
                mesa: null,
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
                const err = await response.text();
                throw new Error('Falha ao criar pedido: ' + err);
            }

            // WhatsApp Message Generation...
            const orderId = `#${Date.now().toString().slice(-4)}`;
            let message = `*🔔 NOVO PEDIDO ${orderId}* 🔔\n\n`;
            message += `👤 *Cliente:* ${checkoutData.nome}\n`;
            if (checkoutData.telefone) message += `📞 *Contato:* ${checkoutData.telefone}\n\n`;
            message += `🛒 *RESUMO DO PEDIDO:*\n`;
            cart.forEach(item => {
                message += `▪️ ${item.quantidade}x *${item.nome}*\n`;
                item.atributos.forEach(attr => {
                    message += `   └ _${attr.nome} (+${formatCurrency(Number(attr.preco))})_\n`;
                });
                message += `\n`;
            });

            if (checkoutData.metodo_entrega === 'ENTREGA') {
                message += `📍 *ENTREGA:*\n${fullAddress}\n`;
                message += `🛵 *Taxa de Entrega:* ${deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}\n\n`;
            } else {
                message += `🛍️ *RETIRADA:*\nO cliente vai retirar o pedido na loja.\n\n`;
            }

            message += `💳 *PAGAMENTO:*\n`;
            message += `Forma: ${checkoutData.pagamento}\n`;
            if (checkoutData.pagamento === 'DINHEIRO' && checkoutData.troco) {
                message += `Troco para: R$ ${checkoutData.troco}\n`;
            }

            message += `\n💰 *SUBTOTAL:* ${formatCurrency(total)}\n`;
            if (checkoutData.metodo_entrega === 'ENTREGA' && deliveryFee > 0) {
                message += `💰 *TAXA ENTREGA:* ${formatCurrency(deliveryFee)}\n`;
            }
            message += `💰 *TOTAL A PAGAR: ${formatCurrency(grandTotal)}*\n`;
            message += `\n_Pedido enviado via Cardápio Digital_`;

            const encoded = encodeURIComponent(message);
            const storePhone = formatWhatsappNumber(store.whatsapp).replace(/\D/g, '');
            window.open(`https://wa.me/${storePhone}?text=${encoded}`, '_blank');

            clearCart();
            setIsCartOpen(false);
            setView('cart');
            setCheckoutData({
                nome: '',
                telefone: '',
                endereco_rua: '',
                endereco_numero: '',
                endereco_bairro: '',
                pagamento: 'PIX',
                metodo_entrega: 'ENTREGA',
                troco: ''
            });

            localStorage.setItem('activeStoreId', store.id.toString());
            setStoreId(store.id);

            alert('Pedido enviado com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Ocorreu um erro ao enviar o pedido.');
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

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 animate-pulse font-black text-primary italic uppercase tracking-widest">Carregando...</div>;
    if (!store) return <div className="min-h-screen flex items-center justify-center text-xl font-black italic uppercase tracking-tight text-gray-400">Loja não encontrada.</div>;

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
            {/* 1. TOPO INFO BAR */}
            <div className="bg-white border-b border-gray-200 py-2 hidden sm:block sticky top-0 z-[60] shadow-sm">
                <div className="max-w-[1400px] mx-auto px-6 flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Clock size={12} className="text-gray-400" />
                            <span>{isOpenStatus.label} • {(() => {
                                const h = store.horario_funcionamento?.[DIAS_MAP[new Date().getDay()]];
                                return h && !h.closed ? `${h.open} - ${h.close}` : 'Fechado hoje';
                            })()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-gray-400" />
                            <span className="max-w-[300px] truncate">{store.endereco}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={`px-2 py-0.5 rounded ${isOpenStatus.open ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {isOpenStatus.label}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. BANNER & HEADER SECTION */}
            <header className="relative">
                {/* Banner Background */}
                <div className="h-48 md:h-64 w-full relative overflow-hidden">
                    {store.banner ? (
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${getImageUrl(store.banner)})` }}>
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
                        </div>
                    ) : (
                        <div className="absolute inset-0" style={{ backgroundColor: store.cor_primaria }}>
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:20px_20px]"></div>
                        </div>
                    )}
                </div>

                {/* Profile Overlay */}
                <div className="max-w-[1400px] mx-auto px-6 relative -mt-16 md:-mt-12 z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                        <div className="relative group">
                            <div className="w-32 h-32 md:w-36 md:h-36 rounded-lg border-4 border-white shadow-lg bg-white overflow-hidden relative z-20">
                                <img src={getImageUrl(store.logo)} alt={store.nome} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            </div>
                        </div>
                        
                        <div className="flex-1 pb-4 md:pb-6">
                            <div className="bg-white/95 backdrop-blur-md p-6 md:p-8 rounded-lg shadow-xl border border-gray-100 inline-block min-w-[300px]">
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 leading-none mb-4">
                                    {store.nome}
                                </h1>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
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

                        {/* NAV / USER ACTIONS (Desktop) */}
                        <div className="hidden lg:flex items-center gap-3 pb-6">
                            <div className="relative group max-w-[200px]">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 h-12 bg-white rounded-lg border border-gray-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                                />
                            </div>

                            {isAuthenticated ? (
                                <>
                                    <Link to={`/s/${slug}/orders`} className="bg-white px-5 h-12 rounded-lg shadow-sm border border-gray-100 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-gray-700 hover:text-primary transition-all">
                                        <List size={18} />
                                        Meus Pedidos
                                    </Link>
                                    <div 
                                        onClick={() => setIsAuthModalOpen(true)}
                                        className="flex items-center gap-3 bg-white px-4 h-12 rounded-lg border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors group/user"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-primary font-bold text-xs border border-gray-100 group-hover/user:border-primary/30 transition-colors">
                                            {customer?.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="hidden xl:block">
                                            <p className="text-[10px] font-bold text-gray-900 leading-none group-hover/user:text-primary transition-colors">{customer?.name}</p>
                                            <p className="text-[9px] text-gray-400 font-medium mt-0.5">{customer?.phone}</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <button 
                                    onClick={() => setIsAuthModalOpen(true)}
                                    className="bg-white px-6 h-12 rounded-lg shadow-sm border border-gray-100 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-gray-700 hover:text-primary hover:border-primary/20 transition-all"
                                >
                                    <LogIn size={18} />
                                    Entrar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* MOBILE USER PROFILE (Visible only on mobile/tablet) */}
                    <div className="lg:hidden mt-6 pb-2">
                        {isAuthenticated ? (
                            <div 
                                onClick={() => setIsAuthModalOpen(true)}
                                className="bg-white/95 backdrop-blur-md p-4 rounded-lg shadow-lg border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-primary font-bold text-sm border border-gray-100">
                                        {customer?.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-900 leading-tight">{customer?.name}</p>
                                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{customer?.phone}</p>
                                    </div>
                                </div>
                                <div className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1.5 rounded-md">
                                    Editar Perfil
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsAuthModalOpen(true)}
                                className="w-full bg-white/95 backdrop-blur-md p-4 rounded-lg shadow-lg border border-gray-100 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-widest text-gray-700 active:scale-[0.98] transition-all"
                            >
                                <LogIn size={18} className="text-primary" />
                                Entrar / Identificar-se
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* 3. MAIN CONTENT: 3 COLUMNS */}
            <main className="max-w-[1400px] mx-auto w-full px-6 py-12 flex gap-8">
                
                {/* A. CATEGORY SIDEBAR */}
                <CategorySidebar 
                    categories={store.categorias} 
                    activeCategory={activeCategory} 
                    onCategoryClick={(id) => {
                        setActiveCategory(id);
                        document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }} 
                    accentColor={store.cor_primaria} 
                />

                {/* B. CENTRAL PRODUCTS GRID */}
                <div className="flex-1 space-y-10">
                    <div className="space-y-4">
                        {/* Search Bar - Rectangular Enterprise Style */}
                        <div className="relative group max-w-2xl">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-300">
                                <Search size={18} style={{ color: store.cor_primaria || '#007A87' }} />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Busque por pratos ou bebidas..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                                        document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
                                    }}
                                    className="w-full h-12 pl-12 pr-10 bg-white border border-gray-200 rounded-lg shadow-sm text-xs font-bold uppercase tracking-widest text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                                >
                                    <option value="" disabled>Filtrar por Categoria</option>
                                    {store.categorias.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                    ))}
                                </select>
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none">
                                    <List size={18} />
                                </div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                    <ChevronDown size={18} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Products Sections */}
                    {filteredCategories.map((cat, idx) => (
                        <section key={cat.id} id={`cat-${cat.id}`} className="animate-fade-in">
                            <div className="flex items-center gap-4 mb-6">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900 bg-gray-100 px-4 py-1.5 rounded-md">
                                    {cat.nome}
                                </h2>
                                <div className="h-px flex-1 bg-gray-200/60"></div>
                            </div>
                            
                            <div className="flex flex-col gap-4">
                                {cat.produtos.map((prod: any) => (
                                    <PublicProductCard 
                                        key={prod.id} 
                                        product={prod} 
                                        accentColor={store.cor_primaria} 
                                        onClick={() => setSelectedProduct(prod)} 
                                        getImageUrl={getImageUrl} 
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                    
                    {filteredCategories.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                             <Search size={48} className="mx-auto text-gray-200 mb-4" />
                             <p className="font-black uppercase italic tracking-tighter text-gray-400">Nenhum produto encontrado</p>
                        </div>
                    )}

                    {/* WHATSAPP BAR */}
                    <button 
                        onClick={() => window.open(`https://wa.me/${formatWhatsappNumber(store.whatsapp)}`)}
                        className="w-full bg-white border-2 border-gray-100 p-8 rounded-[3rem] flex items-center justify-between group hover:border-green-500 transition-all duration-500 shadow-sm"
                    >
                        <span className="text-sm md:text-base font-black uppercase italic tracking-tighter text-gray-900 group-hover:text-green-600 transition-colors">
                            DÚVIDAS? CHAME NO WHATSAPP
                        </span>
                        <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                             <Phone size={24} fill="white" />
                        </div>
                    </button>
                </div>

                {/* C. SHOPPING BAG (DESKTOP) */}
                <aside className="hidden xl:block w-80 sticky top-24 self-start max-h-[calc(100vh-120px)] flex flex-col pt-2">
                    <div className="bg-[#F8F9FA] rounded-lg border border-gray-200 flex flex-col h-full overflow-hidden">
                        <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <ShoppingBag size={18} className="text-gray-400" />
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">Sua Sacola</h2>
                            </div>
                            <div className="bg-gray-100 px-2 py-0.5 rounded text-[9px] font-bold text-gray-500 uppercase tracking-wider">{cart.length} itens</div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {cart.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-100 group relative hover:shadow-sm transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-900 text-[13px] line-clamp-1 flex-1">{item.nome}</h4>
                                        <button onClick={() => removeFromCart(item.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-2 bg-gray-50 rounded border border-gray-100 p-0.5">
                                            <button onClick={() => updateQuantidade(item.id, -1)} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-black transition-colors"><Minus size={12} /></button>
                                            <span className="text-[11px] font-bold w-4 text-center">{item.quantidade}</span>
                                            <button onClick={() => updateQuantidade(item.id, 1)} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-black transition-colors"><Plus size={12} /></button>
                                        </div>
                                        <p className="font-bold text-sm tracking-tight text-gray-900">
                                            {formatCurrency((item.precoBase + item.atributos.reduce((s, a) => s + a.preco, 0)) * item.quantidade)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {cart.length === 0 && (
                                <div className="text-center py-16 opacity-30 select-none">
                                    <ShoppingBag size={48} className="mx-auto mb-4" />
                                    <p className="font-bold uppercase tracking-widest text-xs">Sacola Vazia</p>
                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-6 bg-white border-t border-gray-100 space-y-4">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(total)}</span>
                                    </div>
                                    <div className="flex justify-between items-end pt-1">
                                        <span className="font-bold text-xs uppercase tracking-widest text-gray-900">Total</span>
                                        <span className="text-2xl font-bold tracking-tight text-gray-900">{formatCurrency(total)}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsCartOpen(true)} // Open mobile view for checkout
                                    className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-3"
                                >
                                    FINALIZAR PEDIDO
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </aside>
            </main>

            {/* MOBILE CART BUTTON */}
            <div className="lg:hidden fixed bottom-8 left-6 right-6 z-50">
                <button 
                    onClick={() => setIsCartOpen(true)}
                    className="w-full h-16 bg-gray-900 text-white rounded-xl shadow-2xl flex items-center justify-between px-8 transition-all hover:scale-[1.02] active:scale-95 group overflow-hidden"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 rounded-lg w-8 h-8 flex items-center justify-center text-xs font-bold backdrop-blur-md">
                            {cart.reduce((s, i) => s + i.quantidade, 0)}
                        </div>
                        <span className="font-bold uppercase tracking-widest text-xs">Ver Sacola</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight">{formatCurrency(total)}</span>
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
            </div>

            {/* CART MODAL (For Checkout & Mobile) */}
            {isCartOpen && (
                <div className="fixed inset-0 bg-black/60 shadow-inner z-[100] flex justify-end transition-all">
                    <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col md:rounded-l-xl overflow-hidden animate-slide-left">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                            <div>
                                <h2 className="text-xl font-bold uppercase tracking-widest text-gray-900 leading-none">{view === 'cart' ? 'Sua Sacola' : 'Finalizar'}</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                                    {view === 'cart' ? `${cart.length} itens selecionados` : 'Informe os detalhes da entrega'}
                                </p>
                            </div>
                            <button onClick={() => { setIsCartOpen(false); setView('cart'); }} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"><X size={20} /></button>
                        </div>

                        {/* Profile Info in Drawer */}
                        {isAuthenticated && (
                            <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary font-bold text-xs border border-gray-100">
                                        {customer?.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-900 leading-tight">{customer?.name}</p>
                                        <p className="text-[9px] text-gray-400 font-medium">{customer?.phone}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsAuthModalOpen(true)}
                                    className="text-[9px] font-bold text-primary uppercase tracking-widest hover:underline"
                                >
                                    Alterar
                                </button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                            {view === 'cart' ? (
                                <>
                                    {cart.map(item => (
                                        <div key={item.id} className="flex gap-4 p-4 rounded-lg bg-white border border-gray-100 hover:shadow-sm transition-all group relative">
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-sm text-gray-900 leading-tight">{item.quantidade}x {item.nome}</h4>
                                                    <button onClick={() => removeFromCart(item.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><X size={16} /></button>
                                                </div>
                                                {item.atributos.map(a => (<p key={a.opcaoId} className="text-[10px] font-medium text-gray-400 leading-none mb-1.5">• {a.nome}</p>))}
                                                <div className="flex justify-between items-center mt-3">
                                                    <div className="flex items-center gap-2 bg-gray-50 rounded border border-gray-100 p-0.5">
                                                        <button onClick={() => updateQuantidade(item.id, -1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"><Minus size={12} /></button>
                                                        <span className="text-[11px] font-bold w-4 text-center">{item.quantidade}</span>
                                                        <button onClick={() => updateQuantidade(item.id, 1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"><Plus size={12} /></button>
                                                    </div>
                                                    <p className="font-bold text-base text-gray-900">{formatCurrency((item.precoBase + item.atributos.reduce((s, a) => s + a.preco, 0)) * item.quantidade)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {cart.length === 0 && (
                                        <div className="text-center py-40 space-y-4 opacity-20 select-none flex flex-col items-center">
                                            <ShoppingBag size={80} strokeWidth={1} />
                                            <p className="text-sm font-bold uppercase tracking-widest text-gray-400">Sacola Vazia</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-6 animate-slide-up">
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-l-2 pl-3" style={{ borderColor: store.cor_primaria }}>Identificação</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <input type="text" value={checkoutData.nome} onChange={(e) => setCheckoutData({ ...checkoutData, nome: e.target.value })} className="w-full bg-white border border-gray-200 p-4 rounded-lg font-medium focus:outline-none focus:border-gray-900 transition-colors text-sm" placeholder="Seu Nome" />
                                            <input type="tel" value={checkoutData.telefone} onChange={(e) => setCheckoutData({ ...checkoutData, telefone: e.target.value.replace(/\D/g, '') })} className="w-full bg-white border border-gray-200 p-4 rounded-lg font-medium focus:outline-none focus:border-gray-900 transition-colors text-sm" placeholder="WhatsApp (DDD)" maxLength={11} />
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-l-2 pl-3" style={{ borderColor: store.cor_primaria }}>Metodo de Recebimento</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['ENTREGA', 'RETIRADA'].map((method) => (
                                                <button key={method} onClick={() => setCheckoutData({ ...checkoutData, metodo_entrega: method as DeliveryMethod })} className={`p-4 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-all border ${checkoutData.metodo_entrega === method ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                                                    {method === 'ENTREGA' ? 'Entrega' : 'Retirada'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {checkoutData.metodo_entrega === 'ENTREGA' && (
                                        <div className="space-y-3 animate-slide-up pt-2">
                                             <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-l-2 pl-3" style={{ borderColor: store.cor_primaria }}>Endereço</h3>
                                             <input type="text" value={checkoutData.endereco_rua} onChange={(e) => setCheckoutData({ ...checkoutData, endereco_rua: e.target.value })} className="w-full bg-white border border-gray-200 p-4 rounded-lg font-medium focus:outline-none focus:border-gray-900 transition-colors text-sm" placeholder="Rua / Avenida" />
                                             <div className="grid grid-cols-2 gap-3">
                                                 <input type="text" value={checkoutData.endereco_numero} onChange={(e) => setCheckoutData({ ...checkoutData, endereco_numero: e.target.value })} className="w-full bg-white border border-gray-200 p-4 rounded-lg font-medium focus:outline-none focus:border-gray-900 transition-colors text-sm" placeholder="Nº" />
                                                 {store.tipo_taxa_entrega === 'BAIRRO' ? (
                                                    <select value={checkoutData.endereco_bairro} onChange={(e) => setCheckoutData({ ...checkoutData, endereco_bairro: e.target.value })} className="w-full bg-white border border-gray-200 p-4 rounded-lg font-medium focus:outline-none focus:border-gray-900 transition-colors text-sm appearance-none">
                                                        <option value="" disabled>Bairro</option>
                                                        {store.bairros_entrega?.map(b => (
                                                            <option key={b.id} value={b.nome}>{b.nome} (+{formatCurrency(parseFloat(b.taxa))})</option>
                                                        ))}
                                                    </select>
                                                 ) : (
                                                    <input type="text" value={checkoutData.endereco_bairro} onChange={(e) => setCheckoutData({ ...checkoutData, endereco_bairro: e.target.value })} className="w-full bg-white border border-gray-200 p-4 rounded-lg font-medium focus:outline-none focus:border-gray-900 transition-colors text-sm" placeholder="Bairro" />
                                                 )}
                                             </div>
                                        </div>
                                    )}

                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-l-2 pl-3" style={{ borderColor: store.cor_primaria }}>Pagamento</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO'].map((method) => (
                                                <button key={method} onClick={() => setCheckoutData({ ...checkoutData, pagamento: method as PaymentMethod })} className={`p-4 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-all border ${checkoutData.pagamento === method ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                                                    {method}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {checkoutData.pagamento === 'DINHEIRO' && (
                                        <div className="space-y-2 animate-slide-up pt-2">
                                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-l-2 pl-3" style={{ borderColor: store.cor_primaria }}>Troco para quanto?</h3>
                                            <input type="text" value={checkoutData.troco} onChange={(e) => setCheckoutData({ ...checkoutData, troco: e.target.value.replace(/[^0-9.,]/g, '') })} className="w-full bg-white border border-gray-200 p-4 rounded-lg font-medium focus:outline-none focus:border-gray-900 transition-colors text-sm" placeholder="Ex: R$ 50,00" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-white border-t border-gray-100 space-y-4 pb-12">
                             <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest"><span>Subtotal</span><span>{formatCurrency(total)}</span></div>
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest"><span>Taxa Entrega</span><span>{formatCurrency(deliveryFee)}</span></div>
                                <div className="flex justify-between items-end pt-3">
                                    <span className="font-bold text-xs uppercase tracking-widest text-gray-900">Total</span>
                                    <span className="text-3xl font-bold tracking-tight text-gray-900">{formatCurrency(grandTotal)}</span>
                                </div>
                             </div>

                            {view === 'cart' ? (
                                <button 
                                    onClick={() => setView('checkout')} 
                                    disabled={cart.length === 0} 
                                    className="w-full py-5 bg-gray-900 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    PROSSEGUIR
                                </button>
                            ) : (
                                <div className="flex gap-3">
                                    <button onClick={() => setView('cart')} className="px-6 py-5 bg-white text-gray-900 border border-gray-200 rounded-lg font-bold text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all">Voltar</button>
                                    <button onClick={handleSubmitOrder} disabled={isSubmitting} className="flex-1 py-5 bg-gray-900 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-black active:scale-[0.98] transition-all text-center">
                                         {isSubmitting ? 'ENVIANDO...' : 'ENVIAR PEDIDO'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PRODUCT MODAL */}
            {selectedProduct && (
                <ProductModal
                    isOpen={!!selectedProduct}
                    product={selectedProduct}
                    storeColor={store.cor_primaria}
                    modoCatalogo={false}
                    onClose={() => setSelectedProduct(null)}
                    onAddToCart={(item) => {
                        addToCart(item);
                        setSelectedProduct(null);
                    }}
                />
            )}

            {/* DELIVERY CALCULATOR MODAL */}
            {isDeliveryModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-slide-up">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white">
                            <h2 className="text-lg font-bold uppercase tracking-widest text-gray-900">Taxas de Entrega</h2>
                            <button onClick={() => setIsDeliveryModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"><X size={20} /></button>
                        </div>
                        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
                            {store.tipo_taxa_entrega === 'FIXA' ? (
                                <div className="text-center py-8">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Taxa Fixa para toda a cidade</p>
                                    <p className="text-3xl font-bold tracking-tight text-gray-900">
                                        {formatCurrency(parseFloat(store.taxa_entrega_fixa || '0'))}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {store.bairros_entrega && store.bairros_entrega.length > 0 ? (
                                        <div className="space-y-2">
                                            {store.bairros_entrega.map(b => (
                                                <div key={b.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-all">
                                                    <span className="text-sm font-bold text-gray-700">{b.nome}</span>
                                                    <span className="text-sm font-bold text-gray-900">{formatCurrency(parseFloat(b.taxa))}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-gray-400 font-bold py-8 text-xs uppercase tracking-widest">Nenhuma taxa por bairro cadastrada.</p>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="p-8 bg-gray-50 border-t border-gray-100">
                            <button onClick={() => setIsDeliveryModalOpen(false)} className="w-full py-4 bg-gray-900 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-black transition-all">FECHAR</button>
                        </div>
                    </div>
                </div>
            )}
            {/* AUTH MODAL */}
            <PublicAuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                accentColor={store.cor_primaria} 
            />
        </div>
    );
}
