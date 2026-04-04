import React, { useState, useEffect } from "react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { OrderListSimplified } from "@/components/kanban/OrderListSimplified";
import { useBilling } from "@/context/BillingContext";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function OrdersPage() {
    const { store, loading } = useBilling();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (loading || !store) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (store.status_assinatura !== 'active' && store.status_assinatura !== 'trial') {
        return (
            <div className="h-full flex items-center justify-center p-6 bg-transparent">
                <div className="max-w-md w-full bg-white rounded-xl p-8 shadow-xl border border-gray-100 text-center space-y-6">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto ring-8 ring-red-50/50">
                        <AlertCircle size={40} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black italic uppercase text-gray-900 tracking-tighter">Assinatura Suspensa</h2>
                        <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                            Sua assinatura não está ativa. Para continuar gerenciando seus pedidos e vendendo, por favor regularize seu plano.
                        </p>
                    </div>
                    <Link
                        to="/settings/billing"
                        className="flex items-center justify-center gap-2 w-full bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:shadow-lg transition-all"
                    >
                        Ver Planos e Faturamento <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        );
    }

    if (store.plano_tipo === 'START' || store.plano_details?.nome === 'Basic' || isMobile) {
        return <OrderListSimplified />;
    }

    return <KanbanBoard />;
}

OrdersPage.displayName = 'OrdersPage';
