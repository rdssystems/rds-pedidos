'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Loader2, Plus, Users, Receipt, Clock } from 'lucide-react';

import { useSocket } from '@/context/SocketContext';

const TablesPage = () => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { lastMessage } = useSocket();
    const [mesas, setMesas] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMesa, setSelectedMesa] = useState<number | null>(null);

    const totalTables = 20; // Default number of tables

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

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
        // Polling for updates (fallback)
        const interval = setInterval(fetchMesas, 10000);
        return () => clearInterval(interval);
    }, []);

    // Atualização em tempo real via WebSocket
    useEffect(() => {
        if (lastMessage) {
            console.log("TablesPage: Update received via socket, refreshing...");
            fetchMesas();
        }
    }, [lastMessage]);

    if (loading || isLoading && mesas.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    const getMesaStatus = (num: number) => {
        const mesa = mesas.find(m => m.mesa === num);
        return mesa || null;
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

            <main className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {Array.from({ length: totalTables }, (_, i) => i + 1).map(num => {
                        const status = getMesaStatus(num);
                        const isOccupied = !!status;

                        return (
                            <button
                                key={num}
                                onClick={() => router.push(`/mesas/${num}`)}
                                className={`relative aspect-square rounded-2xl border-2 transition-all p-4 flex flex-col items-center justify-center gap-2 group ${isOccupied
                                    ? 'bg-red-50 border-red-200 shadow-lg shadow-red-500/10'
                                    : 'bg-white border-gray-100 hover:border-primary/30 hover:shadow-xl'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${isOccupied ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors'
                                    }`}>
                                    <span className="text-xl font-black">{num}</span>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isOccupied ? 'text-red-600' : 'text-gray-300'
                                    }`}>
                                    {isOccupied ? 'Ocupada' : 'Livre'}
                                </span>

                                {isOccupied && (
                                    <div className="mt-1 text-center">
                                        <p className="text-sm font-black text-gray-800">R$ {status.total.toFixed(2)}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">{status.itens_count} itens</p>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </main>

            {/* Bottom Nav for Mobile Feel */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-3 flex justify-around items-center z-50 sm:hidden">
                <button className="flex flex-col items-center gap-1 text-primary">
                    <LayoutGrid size={24} />
                    <span className="text-[10px] font-bold uppercase">Mesas</span>
                </button>
                <button onClick={() => router.push('/pos')} className="flex flex-col items-center gap-1 text-gray-400">
                    <Receipt size={24} />
                    <span className="text-[10px] font-bold uppercase">Caixa</span>
                </button>
            </nav>
        </div>
    );
};

export default TablesPage;
