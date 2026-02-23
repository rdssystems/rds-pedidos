'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Plano {
    id: number;
    nome: string;
    preco_mensal: string;
    description: string;
    max_produtos: number;
    recursos: Record<string, boolean>;
}

interface Store {
    id: number;
    nome: string;
    slug: string;
    status_assinatura: 'trial' | 'active' | 'expired' | 'canceled';
    valido_ate: string | null;
    plano_details: Plano | null;
    horario_funcionamento?: any;
}

interface BillingContextType {
    store: Store | null;
    loading: boolean;
    refreshBilling: () => Promise<void>;
    isFeatureEnabled: (featureName: string) => boolean;
    isPlan: (planName: string) => boolean;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export const BillingProvider = ({ children }: { children: ReactNode }) => {
    const [store, setStore] = useState<Store | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchBilling = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('/api/lojas/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            // Backend returns a list or results object
            const s = Array.isArray(data) ? data[0] : (data.results ? data.results[0] : data);

            if (s) {
                setStore(s);
            }
        } catch (error) {
            console.error('Error fetching billing info:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBilling();
    }, []);

    const isFeatureEnabled = (featureName: string) => {
        if (!store?.plano_details?.recursos) return false;
        return !!store.plano_details.recursos[featureName];
    };

    const isPlan = (planName: string) => {
        return store?.plano_details?.nome === planName;
    };

    return (
        <BillingContext.Provider value={{
            store,
            loading,
            refreshBilling: fetchBilling,
            isFeatureEnabled,
            isPlan
        }}>
            {children}
        </BillingContext.Provider>
    );
};

export const useBilling = () => {
    const context = useContext(BillingContext);
    if (context === undefined) {
        throw new Error('useBilling must be used within a BillingProvider');
    }
    return context;
};
