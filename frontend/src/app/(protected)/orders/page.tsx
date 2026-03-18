'use client';

import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { OrderListSimplified } from "@/components/kanban/OrderListSimplified";
import { useBilling } from "@/context/BillingContext";
import { AlertCircle, CreditCard, ArrowRight } from "lucide-react";
import Link from "next/link";

import { useState, useEffect } from "react";

export default function AdminOrdersPage() {
    const { store, loading } = useBilling();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024); // Tablets and mobile usually below 1024px for Kanban
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!store || (store.status_assinatura !== 'active' && store.status_assinatura !== 'trial')) {
        return (
            <div className="h-full flex items-center justify-center p-6 bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 text-center space-y-6">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto ring-8 ring-red-50/50">
                        <AlertCircle size={40} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black italic uppercase text-gray-900 tracking-tighter">Assinatura Suspensa</h2>
                        <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                            Sua assinatura não está ativa. Para continuar gerenciando seus pedidos e vendendo, por favor regularize seu plano.
                        </p>
                    </div>
                    <Link
                        href="/settings/billing"
                        className="flex items-center justify-center gap-2 w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:shadow-lg transition-all"
                    >
                        Ver Planos e Faturamento <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        );
    }

    // Use Simplified view (Generic Mode) on Mobile or for Basic Plan
    if (store.plano_details?.nome === 'Basic' || isMobile) {
        return <OrderListSimplified />;
    }

    // PRO and ELITE get the KanbanBoard on Desktop
    return <KanbanBoard />;
}
