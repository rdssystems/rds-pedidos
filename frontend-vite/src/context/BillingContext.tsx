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
    plano_tipo: 'START' | 'PRO' | 'ELITE';
    horario_funcionamento?: any;
    cor_primaria?: string;
    cor_secundaria?: string;
    logo?: string | null;
    categorias?: any[];
    modo_catalogo?: boolean;
    quantidade_mesas?: number;
    caixa_aberto?: boolean;
    pedidos_pendentes?: number;
    crm_dias_ausente?: number;
    crm_msg_ausente?: string;
}

interface BillingContextType {
    store: Store | null;
    loading: boolean;
    refreshBilling: () => Promise<void>;
    refreshStore: () => Promise<void>;
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
            const stores = Array.isArray(data) ? data : (data.results || [data]);
            
            const activeStoreId = localStorage.getItem('activeStoreId');
            let s = stores.find((item: any) => String(item.id) === String(activeStoreId));
            
            // Fallback to first if not found
            if (!s && stores.length > 0) {
                s = stores[0];
                localStorage.setItem('activeStoreId', String(s.id));
            }

            if (s) {
                if (!s.logo) s.logo = '/logo-perfil.png';
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

    const getImageUrl = (url: string | null) => {
        if (!url || url === '') return '/logo-perfil.png';
        return url;
    };

    return (
        <BillingContext.Provider value={{
            store,
            loading,
            refreshBilling: fetchBilling,
            refreshStore: fetchBilling,
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
