import React from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    ShoppingBag,
    UtensilsCrossed,
    Settings,
    LogOut,
    ChevronRight,
    CreditCard,
    Users,
    MessageSquare,
    LayoutGrid,
    PanelLeftClose,
    PanelLeftOpen,
    AlertTriangle,
    Menu,
    X,
    Bell,
} from 'lucide-react';

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useBilling } from '@/context/BillingContext';

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
    const { logout, user } = useAuth();
    const { store } = useBilling();
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname;

    const [isMinimized, setIsMinimized] = React.useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [closingAlert, setClosingAlert] = React.useState<string | null>(null);
    const [notifications, setNotifications] = React.useState<any[]>([]);
    const [isNotifOpen, setIsNotifOpen] = React.useState(false);
    const notifRef = React.useRef<HTMLDivElement>(null);

    // Close mobile menu on navigation
    React.useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    // Get all unique roles user has across all stores (simplified for now)
    const [userRoles, setUserRoles] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (user?.roles) {
            setUserRoles(user.roles.map(r => r.role));
        }
    }, [user]);

    React.useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/notificacoes-sistema/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    // Filter unread notifications
                    setNotifications(data.filter((n: any) => !n.lida));
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close notifications on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkLida = async (id: number) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/notificacoes-sistema/${id}/marcar-lida/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    React.useEffect(() => {
        if (!store?.horario_funcionamento) return;

        const checkClosingTime = () => {
            const now = new Date();
            const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
            const todayStr = days[now.getDay()];

            const todayConfig = store.horario_funcionamento[todayStr];
            if (!todayConfig || !todayConfig.close || todayConfig.closed) {
                setClosingAlert(null);
                return;
            }

            const [closeH, closeM] = todayConfig.close.split(':').map(Number);
            const closeTime = new Date();
            closeTime.setHours(closeH, closeM, 0, 0);

            // If close time is past midnight (e.g. 02:00) and current time is late night (e.g. 23:40)
            if (closeH <= 6 && now.getHours() >= 18) {
                closeTime.setDate(closeTime.getDate() + 1);
            }

            const realDiffMs = closeTime.getTime() - now.getTime();
            const realDiffMins = Math.floor(realDiffMs / 60000);

            const canManageBox = userRoles.includes('owner') || userRoles.includes('manager') || userRoles.includes('cashier');

            if (canManageBox && realDiffMins <= 30 && realDiffMins >= -30) {
                const pendingOrders = store.pedidos_pendentes || 0;
                const pendingMsg = pendingOrders > 0 ? ` Há ${pendingOrders} pedidos pendentes para finalizar.` : '';

                setClosingAlert(
                    realDiffMins > 0
                        ? `Faltam ${realDiffMins} minutos para o fechamento. Não esqueça de fechar o caixa!${pendingMsg}`
                        : `O horário de fechamento já passou. Não esqueça de fechar o caixa!${pendingMsg}`
                );
            } else {
                setClosingAlert(null);
            }
        };

        checkClosingTime();
        const interval = setInterval(checkClosingTime, 60000);
        return () => clearInterval(interval);
    }, [store?.horario_funcionamento, userRoles, store?.pedidos_pendentes]);

    // Don't show sidebar on login page
    if (pathname === '/login') {
        return <>{children}</>;
    }

    const menuItems = [
        { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['owner', 'manager'] },
        { label: 'Mesas', icon: LayoutGrid, href: '/mesas', roles: ['owner', 'manager', 'waiter'], plan: ['PRO', 'ELITE'] },
        { label: 'Pedidos', icon: ShoppingBag, href: '/orders', roles: ['owner', 'manager', 'waiter', 'kitchen', 'driver', 'cashier'], plan: ['PRO', 'ELITE'] },
        { label: 'Caixa', icon: CreditCard, href: '/pos', roles: ['owner', 'manager', 'cashier'], plan: ['START', 'PRO', 'ELITE'] },
        { label: 'Cardápio', icon: UtensilsCrossed, href: '/menu', roles: ['owner', 'manager'] },
        { label: 'Equipe', icon: Users, href: '/settings/team', roles: ['owner', 'manager'], plan: ['PRO', 'ELITE'] },
        { label: 'Integrações', icon: MessageSquare, href: '/integrations', roles: ['owner', 'manager'], plan: ['PRO', 'ELITE'] },
        { label: 'Assinatura', icon: CreditCard, href: '/settings/billing', roles: ['owner'] },
        { label: 'Configurações', icon: Settings, href: '/settings', roles: ['owner', 'manager'] },
    ];

    // Determine the "primary" role label to show
    const getRoleLabel = () => {
        if (userRoles.includes('driver')) return 'Entregador';
        if (userRoles.includes('owner')) return 'Proprietário';
        if (userRoles.includes('manager')) return 'Gerente';
        if (userRoles.includes('cashier')) return 'Op. de Caixa';
        if (userRoles.includes('waiter')) return 'Atendente';
        if (userRoles.includes('kitchen')) return 'Cozinha';
        return 'Membro';
    };

    const isSubscriptionActive = store?.status_assinatura === 'active' || store?.status_assinatura === 'trial';

    const filteredMenuItems = menuItems.filter(item => {
        // 1. Check Roles
        const hasRole = item.roles.some(role => userRoles.includes(role as any));
        if (!hasRole) return false;

        // 2. Check Plan Requirements
        if (item.plan && !item.plan.includes(store?.plano_tipo as any) && store?.status_assinatura !== 'trial') {
            return false;
        }

        // 3. Check Subscription Status
        if (!isSubscriptionActive && !['Assinatura', 'Configurações'].includes(item.label)) {
            return false;
        }

        return true;
    });

    // Handle unauthorized access (Redirect from dashboard if waiter)
    React.useEffect(() => {
        if (!userRoles.length || pathname === '/login') return;

        const currentItem = menuItems.find(item => item.href === pathname);
        if (currentItem) {
            const hasAccess = currentItem.roles.some(role => userRoles.includes(role));
            if (!hasAccess) {
                if (pathname === '/dashboard' && userRoles.includes('waiter')) {
                    navigate('/orders');
                } else if (pathname !== '/orders' && userRoles.includes('waiter') && !['/mesas', '/orders'].includes(pathname)) {
                    navigate('/orders');
                }
            }
        } else if (pathname === '/') {
            if (userRoles.includes('waiter')) navigate('/orders');
            else navigate('/dashboard');
        }
    }, [pathname, userRoles, navigate]);

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="mr-1 p-1 text-gray-500 hover:text-primary transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-white shadow-lg shrink-0 overflow-hidden border border-gray-100">
                        {store?.logo ? (
                            <img src={store.logo.includes('http') ? store.logo : `${store.logo}?v=${new Date().getTime()}`} alt={store.nome} className="w-full h-full object-cover" />
                        ) : (
                            <img src="/logo-perfil.png" alt="Padrão" className="w-full h-full object-cover opacity-80" />
                        )}
                    </div>
                    <h1 className="text-base font-black text-[#0f172a] italic tracking-tighter uppercase leading-tight line-clamp-2 max-w-[200px]">{store?.nome || 'Admin'}</h1>
                </div>
                <button
                    onClick={logout}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                    <LogOut size={20} />
                </button>
            </div>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[55] transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                ${isMinimized ? 'md:w-20' : 'md:w-64'} 
                bg-white border-r border-gray-100 
                fixed md:sticky top-0 h-screen z-[60]
                transition-all duration-300 ease-in-out md:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl w-64' : '-translate-x-full w-64 md:w-auto'}
                flex flex-col md:rounded-tr-[8px] md:rounded-br-[8px]
            `}>
                <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="md:hidden absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-md"
                >
                    <X size={20} />
                </button>

                {/* Logo Section */}
                <div className={`p-6 ${isMinimized ? 'px-4' : 'pb-4 p-8'}`}>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gray-50 rounded-[8px] flex items-center justify-center text-[#4338ca] shadow-sm shrink-0 mx-auto font-black italic border border-gray-200 overflow-hidden">
                                {store?.logo ? (
                                    <img src={store.logo.includes('http') ? store.logo : `${store.logo}?v=${new Date().getTime()}`} alt={store.nome} className="w-full h-full object-cover" />
                                ) : (
                                    <img src="/logo-perfil.png" alt="Padrão" className="w-full h-full object-cover opacity-80" />
                                )}
                            </div>
                            {!isMinimized && (
                                <div className="flex flex-col min-w-0">
                                    <h1 className="text-sm font-bold text-[#333333] tracking-tighter uppercase leading-tight truncate">
                                        {store?.nome || 'Admin'}
                                    </h1>
                                    <span className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mt-0.5">Gestão SaaS</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Minimize Toggle */}
                <div className="hidden md:flex px-4 py-2 border-y border-gray-50 bg-[#FCFDFE] justify-center">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1.5 text-gray-400 hover:text-[#006D76] hover:bg-white rounded-md transition-all shadow-sm border border-transparent hover:border-gray-100"
                        title={isMinimized ? "Expandir" : "Minimizar"}
                    >
                        {isMinimized ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                    </button>
                </div>

                <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {filteredMenuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href === '/integrations' && pathname.startsWith('/integrations'));
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`flex items-center ${isMinimized ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-md font-bold transition-all group relative ${isActive
                                    ? 'bg-[#006D76] text-white shadow-md'
                                    : 'text-[#333333] hover:bg-[#F3F4F6] hover:text-[#000000]'
                                    }`}
                                title={isMinimized ? item.label : ""}
                            >
                                <div className="flex items-center gap-3 relative z-10">
                                    <item.icon size={18} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-700 transition-colors'} />
                                    {!isMinimized && <span className="text-sm tracking-tight font-medium">{item.label}</span>}
                                </div>
                                {isActive && !isMinimized && <ChevronRight size={14} className="opacity-40" />}
                                
                                {/* Professional Left Selection Indicator */}
                                {isActive && (
                                    <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#006D76] rounded-r-full shadow-[2px_0_8px_rgba(0,109,118,0.4)] z-20" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-gray-100 mt-auto bg-gray-50/50">
                    <div className={`bg-white rounded-lg ${isMinimized ? 'p-1' : 'p-3'} mb-3 border border-gray-200 shadow-sm flex flex-col gap-2`}>
                        <div className="flex w-full items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] font-black text-gray-500 uppercase shrink-0 border border-gray-200">
                                {user?.first_name?.[0] || user?.email?.[0] || 'A'}
                            </div>
                            {!isMinimized && (
                                <div className="flex flex-col overflow-hidden flex-1">
                                    <span className="text-[11px] font-bold text-gray-900 truncate leading-tight">{user?.first_name || user?.email?.split('@')[0] || 'Usuário'}</span>
                                    <span className="text-[8px] font-bold text-gray-400 tracking-wider uppercase leading-tight">{getRoleLabel()}</span>
                                </div>
                            )}
                        </div>

                        {!isMinimized && store && (
                            <div className="w-full flex flex-col gap-2 pt-2 border-t border-gray-100">
                                {(() => {
                                    const currentPlan = store.plano_details?.nome || 'START';
                                    
                                    // Calculate remaining days
                                    const getRemainingDays = () => {
                                        if (!store.valido_ate) return null;
                                        const now = new Date();
                                        const expiry = new Date(store.valido_ate);
                                        const diffTime = expiry.getTime() - now.getTime();
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                        return diffDays;
                                    };
                                    
                                    const daysLeft = getRemainingDays();

                                    return (
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[8px] font-black px-2 py-0.5 rounded bg-[#006D76] text-white uppercase tracking-widest">
                                                    {currentPlan}
                                                </span>
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {store.status_assinatura === 'trial' ? 'Grátis' : 'Ativo'}
                                                </span>
                                            </div>
                                            {daysLeft !== null && (
                                                <div className="flex items-center justify-between group/days">
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Vencimento</span>
                                                    <span className={`text-[9px] font-black italic tracking-tighter ${daysLeft <= 3 ? 'text-red-500' : 'text-gray-900'}`}>
                                                        {daysLeft <= 0 ? 'Expirado' : `EXPIRA EM ${daysLeft} DIAS`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={logout}
                        className={`flex items-center ${isMinimized ? 'justify-center' : 'gap-2'} px-3 py-2 w-full text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md font-bold transition-all group text-xs`}
                        title={isMinimized ? "Sair do Sistema" : ""}
                    >
                        <LogOut size={16} className="group-hover:text-red-500 transition-colors" />
                        {!isMinimized && <span className="uppercase tracking-widest text-[9px]">Sair do Sistema</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-screen md:h-screen overflow-hidden">
                {/* Header / Top Bar */}
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 relative z-[50]">
                    <div className="flex items-center gap-4">
                        <div className="md:hidden w-8 h-8 bg-primary/10 rounded flex items-center justify-center text-primary font-bold">
                            {store?.nome?.[0]}
                        </div>
                        <h2 className="hidden md:block text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {menuItems.find(item => item.href === pathname)?.label || 'Gestão'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Notification Bell */}
                        <div className="relative" ref={notifRef}>
                            <button 
                                onClick={() => setIsNotifOpen(!isNotifOpen)}
                                className={`p-2 rounded-lg transition-all relative ${isNotifOpen ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
                            >
                                <Bell size={20} />
                                {notifications.length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-bounce">
                                        {notifications.length}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {isNotifOpen && (
                                <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 py-4 animate-slide-up z-[60]">
                                    <div className="px-4 pb-3 border-b border-gray-50 flex justify-between items-center">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900">Notificações</h3>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{notifications.length} novas</span>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                        {notifications.length > 0 ? (
                                            notifications.map((n) => (
                                                <div key={n.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors group relative">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className="text-[11px] font-bold text-gray-900 leading-tight">{n.titulo}</p>
                                                        <button 
                                                            onClick={() => handleMarkLida(n.id)}
                                                            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                                                            title="Marcar como lida"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 leading-relaxed pr-4">{n.mensagem}</p>
                                                    <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter mt-2 block">
                                                        {new Date(n.criado_em).toLocaleString('pt-BR')}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-12 text-center opacity-20">
                                                <Bell size={40} className="mx-auto mb-2" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest">Sem notificações</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Profile Info (Compact) */}
                        <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-100">
                            <div className="text-right">
                                <p className="text-[11px] font-bold text-gray-900 leading-none">{user?.first_name || 'Admin'}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{getRoleLabel()}</p>
                            </div>
                        </div>
                    </div>
                </header>

                {closingAlert && (
                    <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-center gap-3 font-bold text-sm shadow-md z-40 animate-slide-down sticky top-0">
                        <AlertTriangle size={18} className="animate-pulse" />
                        <span>{closingAlert}</span>
                        <Link to="/pos" className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs transition-colors ml-4 uppercase tracking-widest hidden sm:block">
                            Ver Caixa
                        </Link>
                    </div>
                )}
                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
};
