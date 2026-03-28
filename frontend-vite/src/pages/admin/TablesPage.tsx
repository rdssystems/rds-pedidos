import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Loader2, Receipt, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useBilling } from '@/context/BillingContext';

const TablesPage = () => {
    const { user, loading: authLoading } = useAuth();
    const { store, loading: billingLoading } = useBilling();
    const navigate = useNavigate();
    const { lastMessage } = useSocket();
    const [mesas, setMesas] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const totalTables = store?.quantidade_mesas || 0;

    const fetchMesas = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const storeId = localStorage.getItem('activeStoreId');
            const res = await fetch(`/api/pedidos/mesas/?loja_id=${storeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMesas(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMesas();
        const interval = setInterval(fetchMesas, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (lastMessage) {
            fetchMesas();
        }
    }, [lastMessage]);

    if (authLoading || billingLoading || (isLoading && mesas.length === 0)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-primary" size={48} />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Carregando...</p>
                </div>
            </div>
        );
    }

    const getMesaStatus = (num: number) => {
        return mesas.find(m => m.mesa === num) || null;
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white border-b px-6 py-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Atendimento</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Mapa de Mesas</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={fetchMesas} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        <Clock size={20} className="text-gray-600" />
                    </button>
                </div>
            </header>

            <main className="p-4 sm:p-6">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-2 sm:gap-4">
                    {Array.from({ length: totalTables }, (_, i) => i + 1).map(num => {
                        const status = getMesaStatus(num);
                        const isOccupied = !!status;

                        return (
                            <button
                                key={num}
                                onClick={() => navigate(`/mesas/${num}`)}
                                className={`relative aspect-square rounded-xl sm:rounded-xl border-2 transition-all p-1 sm:p-4 flex flex-col items-center justify-center gap-0.5 sm:gap-2 group ${isOccupied
                                    ? 'bg-red-50 border-red-200 shadow-lg shadow-red-500/10'
                                    : 'bg-white border-gray-100 hover:border-primary/30 hover:shadow-xl'
                                    }`}
                            >
                                <div className={`w-6 h-6 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-0 sm:mb-1 ${isOccupied ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    <span className="text-xs sm:text-xl font-black">{num}</span>
                                </div>
                                <span className={`text-[7px] sm:text-[10px] font-black uppercase tracking-widest ${isOccupied ? 'text-red-600' : 'text-gray-300'}`}>
                                    {isOccupied ? 'Ocupada' : 'Livre'}
                                </span>
                                {isOccupied && (
                                    <div className="mt-0 sm:mt-1 text-center leading-tight">
                                        <p className="text-[8px] sm:text-sm font-black text-gray-800">R$ {status.total.toFixed(0)}</p>
                                        <p className="text-[6px] sm:text-[9px] font-bold text-gray-400 uppercase">{status.itens_count} it</p>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-3 flex justify-around items-center z-50 sm:hidden">
                <button className="flex flex-col items-center gap-1 text-primary">
                    <LayoutGrid size={24} />
                    <span className="text-[10px] font-bold uppercase">Mesas</span>
                </button>
                <button onClick={() => navigate('/pos')} className="flex flex-col items-center gap-1 text-gray-400">
                    <Receipt size={24} />
                    <span className="text-[10px] font-bold uppercase">Caixa</span>
                </button>
            </nav>
        </div>
    );
};

export default TablesPage;
