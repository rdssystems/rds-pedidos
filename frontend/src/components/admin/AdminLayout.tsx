'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    ShoppingBag,
    UtensilsCrossed,
    Settings,
    LogOut,
    ChevronRight,
    ChefHat,
    CreditCard,
    Users,
    MessageSquare,
    LayoutGrid,
    PanelLeftClose,
    PanelLeftOpen,
    AlertTriangle,
    Menu,
    X,
    Bot
} from 'lucide-react';


import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useBilling } from '@/context/BillingContext';

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
    const { logout, user } = useAuth();
    const { store } = useBilling();
    const pathname = usePathname();
    const router = useRouter();
    const [isMinimized, setIsMinimized] = React.useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [closingAlert, setClosingAlert] = React.useState<string | null>(null);

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

            // Also if close time is today (02:00) and it's already 02:10, realDiffMins will be -10

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
    }, [store?.horario_funcionamento, userRoles]);

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
        // Give trial accounts access to all plan features to let them evaluate the full platform
        if (item.plan && !item.plan.includes(store?.plano_tipo as any) && store?.status_assinatura !== 'trial') {
            return false;
        }

        // 3. Check Subscription Status (Only block operational screens if inactive)
        // Allow billing and settings even if inactive
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
                // If on dashboard and is waiter, redirect to /orders or /mesas
                if (pathname === '/dashboard' && userRoles.includes('waiter')) {
                    router.push('/orders');
                } else if (pathname !== '/orders' && userRoles.includes('waiter') && !['/mesas', '/orders'].includes(pathname)) {
                    // Waiters should only be on /mesas or /orders
                    router.push('/orders');
                }
            }
        } else if (pathname === '/') {
            // Default redirect from root
            if (userRoles.includes('waiter')) router.push('/orders');
            else router.push('/dashboard');
        }
    }, [pathname, userRoles]);

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
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
                        {store?.nome?.[0] || 'R'}
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
                bg-white border-r border-gray-200 
                fixed md:sticky top-0 h-screen z-[60]
                transition-all duration-300 ease-in-out md:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl w-64' : '-translate-x-full w-64 md:w-auto'}
                flex flex-col 
            `}>
                {/* Mobile Close Button inside sidebar */}
                <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="md:hidden absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-full"
                >
                    <X size={20} />
                </button>

                <div className={`p-6 ${isMinimized ? 'px-4' : 'pb-4 p-8'}`}>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0 mx-auto font-black italic">
                                {store?.nome?.[0] || 'R'}
                            </div>
                            {!isMinimized && (
                                <div className="flex flex-col min-w-0">
                                    <h1 className="text-lg font-black text-[#0f172a] italic tracking-tighter uppercase leading-tight break-words">
                                        {store?.nome || 'Admin'}
                                    </h1>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1">Painel Gestão</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Toggle Button (Desktop Only) */}
                <div className="hidden md:flex px-4 py-2 border-y border-gray-50 bg-gray-50/30 justify-center">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-100"
                        title={isMinimized ? "Expandir" : "Minimizar"}
                    >
                        {isMinimized ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {filteredMenuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href === '/integrations' && pathname.startsWith('/integrations'));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center ${isMinimized ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-2xl font-bold transition-all group ${isActive
                                    ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                                    }`}
                                title={isMinimized ? item.label : ''}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon size={20} className={isActive ? 'text-primary' : 'group-hover:text-primary transition-colors'} />
                                    {!isMinimized && <span>{item.label}</span>}
                                </div>
                                {isActive && !isMinimized && <ChevronRight size={16} />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto">
                    <div className={`bg-gray-50 rounded-3xl ${isMinimized ? 'p-2' : 'p-4'} mb-4 border border-gray-100 flex flex-col items-center gap-3`}>
                        <div className="flex w-full items-center gap-3 justify-center">
                            <div className="w-10 h-10 bg-gradient-to-tr from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-xs font-black text-gray-400 uppercase shrink-0">
                                {user?.first_name?.[0] || user?.email?.[0] || 'A'}
                            </div>
                            {!isMinimized && (
                                <div className="flex flex-col overflow-hidden flex-1">
                                    <span className="text-sm font-black text-gray-900 truncate">{user?.first_name || user?.email?.split('@')[0] || 'Usuário'}</span>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">{getRoleLabel()}</span>
                                </div>
                            )}
                        </div>

                        {!isMinimized && store && (
                            <div className="w-full flex-col gap-1 border-t border-gray-200 pt-3 flex animate-fade-in-up">
                                {(() => {
                                    const currentPlan = store.plano_details?.nome || 'Sem Plano';
                                    const statusLabel = {
                                        trial: 'Trial 7 dias',
                                        active: 'Ativo',
                                        expired: 'Expirado',
                                        canceled: 'Cancelado'
                                    }[store.status_assinatura] || store.status_assinatura;

                                    let daysLeft = 0;
                                    if (store.valido_ate) {
                                        const end = new Date(store.valido_ate);
                                        const now = new Date();
                                        const diff = end.getTime() - now.getTime();
                                        daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
                                    }

                                    return (
                                        <div className="flex flex-col gap-1 w-full bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Plano</span>
                                                <span className="text-[10px] font-black text-primary">{currentPlan}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${store.status_assinatura === 'trial' ? 'bg-orange-100 text-orange-600' :
                                                    store.status_assinatura === 'active' ? 'bg-green-100 text-green-600' :
                                                        'bg-red-100 text-red-600'
                                                    }`}>
                                                    {statusLabel}
                                                </span>
                                            </div>
                                            {(store.status_assinatura === 'trial' || store.status_assinatura === 'active') && daysLeft > 0 && (
                                                <div className="text-[10px] font-semibold text-gray-400 mt-1 text-center bg-gray-50 py-1 rounded-lg">
                                                    {daysLeft} dia{daysLeft > 1 ? 's' : ''} restante{daysLeft > 1 ? 's' : ''}
                                                </div>
                                            )}
                                            {store.status_assinatura === 'expired' && (
                                                <div className="text-[10px] font-bold text-red-500 mt-1 text-center bg-red-50 py-1 rounded-lg">
                                                    Renovação pendente
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
                        className={`flex items-center ${isMinimized ? 'justify-center' : 'gap-3'} px-4 py-3 w-full text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl font-bold transition-all group`}
                        title={isMinimized ? "Sair do Sistema" : ""}
                    >
                        <LogOut size={20} className="group-hover:text-red-500 transition-colors" />
                        {!isMinimized && <span>Sair do Sistema</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-screen md:h-screen overflow-hidden">
                {closingAlert && (
                    <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-center gap-3 font-bold text-sm shadow-md z-50 animate-slide-down sticky top-0 md:relative">
                        <AlertTriangle size={18} className="animate-pulse" />
                        <span>{closingAlert}</span>
                        <Link href="/pos" className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs transition-colors ml-4 uppercase tracking-widest hidden sm:block">
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
