import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBilling } from '../../context/BillingContext';
import { Users, Search, MessageSquare, History, Calendar, ChevronRight, Loader2, Phone, Settings as SettingsIcon, X, Save, AlertCircle, CheckSquare, Square, Play, Pause, RefreshCw, Send, CheckCircle2, Trash2, FileText, Clock, ShoppingBag, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface ClienteCRM {
    nome: string;
    cliente_whatsapp: string;
    total_pedidos: number;
    total_gasto: number;
    ultima_compra: string;
}

interface PerfilCliente {
    id: number;
    whatsapp: string;
    nome: string;
    observacoes: string;
}

interface ItemHistorico {
    id: number;
    criado_em: string;
    total: number;
    status: string;
    itens: {
        produto_nome: string;
        quantidade: number;
    }[];
}

export default function CrmPage() {
    const { user } = useAuth();
    const { store, refreshStore } = useBilling();
    const [clientes, setClientes] = useState<ClienteCRM[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Selection State
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    
    // Bulk Sending State
    const [isBulkSending, setIsBulkSending] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(0);
    const [bulkStatus, setBulkStatus] = useState<'idle' | 'sending' | 'waiting' | 'paused' | 'finished'>('idle');
    const [currentSendingIdx, setCurrentSendingIdx] = useState(-1);
    const [countdown, setCountdown] = useState(0);
    const [bulkLogs, setBulkLogs] = useState<{name: string, status: 'ok' | 'error'}[]>([]);

    // Histórico e Perfil
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedClientDetail, setSelectedClientDetail] = useState<{
        perfil: PerfilCliente;
        historico: ItemHistorico[];
    } | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [tempNotes, setTempNotes] = useState('');

    // CRM Settings Local States
    const [crmDays, setCrmDays] = useState(30);
    const [crmMsg, setCrmMsg] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchClientes = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const storeId = localStorage.getItem('activeStoreId');
            const res = await fetch(`/api/pedidos/crm-clientes/?loja_id=${storeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setClientes(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClientes();
        if (store) {
            setCrmDays(store.crm_dias_ausente || 30);
            setCrmMsg(store.crm_msg_ausente || '');
        }
    }, [store]);

    const handleSaveSettings = async () => {
        if (!store) return;
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/lojas/${store.slug}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    crm_dias_ausente: crmDays,
                    crm_msg_ausente: crmMsg
                })
            });
            if (res.ok) {
                await refreshStore();
                setIsSettingsOpen(false);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleSelect = (phone: string) => {
        setSelectedClients(prev => 
            prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
        );
    };

    const selectQuick = (limit: number | 'all') => {
        const filtered = clientes.filter(c => isAusente(c.ultima_compra));
        const toSelect = limit === 'all' ? filtered : filtered.slice(0, limit);
        setSelectedClients(toSelect.map(c => c.cliente_whatsapp));
    };

    const isAusente = (dateStr: string) => {
        const last = new Date(dateStr);
        const now = new Date();
        const diff = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= crmDays;
    };

    const startBulkSend = async () => {
        if (selectedClients.length === 0) return;
        setIsBulkSending(true);
        setBulkStatus('sending');
        setBulkProgress(0);
        setCurrentSendingIdx(0);
        setBulkLogs([]);
    };

    const sendOne = useCallback(async (idx: number) => {
        const phone = selectedClients[idx];
        const cliente = clientes.find(c => c.cliente_whatsapp === phone);
        if (!cliente || !store) return;

        setBulkStatus('sending');
        try {
            const token = localStorage.getItem('token');
            const personalizedMsg = crmMsg.replace('{nome}', cliente.nome || 'Cliente');
            
            const res = await fetch('/api/pedidos/enviar-mensagem-crm/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    loja_id: store.id,
                    whatsapp: phone,
                    mensagem: personalizedMsg
                })
            });
            
            setBulkLogs(prev => [...prev, { name: cliente.nome || phone, status: res.ok ? 'ok' : 'error' }]);
        } catch (err) {
            setBulkLogs(prev => [...prev, { name: cliente.nome || phone, status: 'error' }]);
        }

        const nextIdx = idx + 1;
        setBulkProgress(Math.round((nextIdx / selectedClients.length) * 100));

        if (nextIdx < selectedClients.length) {
            setCurrentSendingIdx(nextIdx);
            setBulkStatus('waiting');
            const waitTime = Math.floor(Math.random() * (15 - 8 + 1) + 8); // 8-15 seconds
            setCountdown(waitTime);
        } else {
            setBulkStatus('finished');
        }
    }, [selectedClients, clientes, crmMsg, store]);

    useEffect(() => {
        let timer: any;
        if (bulkStatus === 'waiting' && countdown > 0) {
            timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        } else if (bulkStatus === 'waiting' && countdown === 0) {
            sendOne(currentSendingIdx);
        } else if (bulkStatus === 'sending' && currentSendingIdx >= 0 && bulkLogs.length === currentSendingIdx) {
            sendOne(currentSendingIdx);
        }
        return () => clearTimeout(timer);
    }, [bulkStatus, countdown, currentSendingIdx, sendOne, bulkLogs.length]);

    const filteredClientes = clientes.filter(c => 
        (c.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        c.cliente_whatsapp.includes(searchTerm)
    );

    const handleDeleteClient = async (phone: string, name: string) => {
        if (!confirm(`Deseja realmente excluir o cliente ${name || phone}? Todos os seus pedidos associados serão removidos.`)) return;
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/pedidos/excluir-cliente-crm/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    loja_id: store?.id,
                    whatsapp: phone
                })
            });
            if (res.ok) {
                alert('Cliente removido com sucesso!');
                fetchClientes();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Deseja realmente excluir os ${selectedClients.length} clientes selecionados? Todos os seus pedidos associados serão removidos.`)) return;
        
        try {
            const token = localStorage.getItem('token');
            for (const phone of selectedClients) {
                await fetch('/api/pedidos/excluir-cliente-crm/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        loja_id: store?.id,
                        whatsapp: phone
                    })
                });
            }
            alert('Clientes selecionados removidos com sucesso!');
            setSelectedClients([]);
            fetchClientes();
        } catch (err) {
            console.error(err);
        }
    };

    const handleOpenHistory = async (whatsapp: string) => {
        try {
            const token = localStorage.getItem('token');
            const storeId = localStorage.getItem('activeStoreId') || store?.id;
            
            if (!storeId) {
                alert("ID da loja não encontrado. Recarregue a página.");
                return;
            }

            const res = await fetch(`/api/pedidos/get-cliente-detalhes/?loja_id=${storeId}&whatsapp=${whatsapp}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setSelectedClientDetail(data);
                setTempNotes(data.perfil.observacoes || '');
                setIsHistoryModalOpen(true);
            } else {
                const errData = await res.json();
                alert(`Erro ao buscar histórico: ${errData.error || 'Erro desconhecido'}`);
            }
        } catch (err) {
            console.error("Erro ao abrir histórico:", err);
            alert("Erro de conexão ao buscar histórico do cliente.");
        }
    };

    const handleSaveProfile = async () => {
        if (!selectedClientDetail) return;
        setIsSavingProfile(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/pedidos/salvar-cliente-perfil/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    loja_id: store?.id,
                    whatsapp: selectedClientDetail.perfil.whatsapp,
                    observacoes: tempNotes
                })
            });
            if (res.ok) {
                alert('Observações salvas!');
                setSelectedClientDetail({
                    ...selectedClientDetail,
                    perfil: { ...selectedClientDetail.perfil, observacoes: tempNotes }
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSavingProfile(false);
        }
    };

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                     <h1 className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase flex items-center gap-3">
                        <Users className="text-primary" size={32} />
                        Clientes
                    </h1>
                    <p className="text-gray-400 font-bold uppercase text-[9px] tracking-[0.2em] mt-1 ml-1">Gerencie e conheça os seus clientes.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group w-full md:w-64">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={16} />
                         <input
                            type="text"
                            placeholder="BUSCAR CLIENTE..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:border-primary outline-none text-[10px] uppercase font-black tracking-widest"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-primary shadow-sm transition-all"
                        title="Configurações de Campanha"
                    >
                        <SettingsIcon size={20} />
                    </button>
                </div>
            </div>

            {/* Selection Bar (Sticky at bottom or top) */}
            {selectedClients.length > 0 && (
                <div className="sticky top-4 bg-white/80 backdrop-blur-md border border-primary/20 p-4 rounded-2xl shadow-2xl z-[100] animate-slide-down flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-black">
                            {selectedClients.length}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-900 tracking-widest">Clientes Selecionados</p>
                            <button onClick={() => setSelectedClients([])} className="text-[9px] font-bold text-red-500 uppercase hover:underline">Limpar Seleção</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleBulkDelete}
                            className="px-6 py-3.5 bg-red-50 text-red-600 border border-red-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2"
                        >
                            <Trash2 size={16} />
                            EXCLUIR SELECIONADOS
                        </button>
                        <button 
                            onClick={startBulkSend}
                            className="px-8 py-3.5 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Send size={16} />
                            INICIAR DISPARO EM MASSA
                        </button>
                    </div>
                </div>
            )}

            {/* Bulk Selection Helpers */}
            <div className="flex flex-wrap gap-2">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center mr-2">Selecionar:</span>
                {[10, 15, 20, 50, 'all'].map(qty => (
                    <button 
                        key={qty}
                        onClick={() => selectQuick(qty as any)}
                        className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase hover:border-primary hover:text-primary transition-all shadow-sm"
                    >
                        {qty === 'all' ? 'Todos os Ausentes' : `${qty} Ausentes`}
                    </button>
                ))}
            </div>

            {/* Client List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-5 w-14">
                                    <button 
                                        onClick={() => {
                                            if (selectedClients.length > 0) setSelectedClients([]);
                                            else setSelectedClients(filteredClientes.map(c => c.cliente_whatsapp));
                                        }}
                                        className="text-gray-300 hover:text-primary transition-colors"
                                    >
                                        <CheckSquare size={20} />
                                    </button>
                                </th>
                                <th className="px-6 py-5 text-[9px] font-black uppercase text-gray-400 tracking-widest">Cliente</th>
                                <th className="px-6 py-5 text-[9px] font-black uppercase text-gray-400 tracking-widest">Pedidos</th>
                                <th className="px-6 py-5 text-[9px] font-black uppercase text-gray-400 tracking-widest">Última Compra</th>
                                <th className="px-6 py-5 text-[9px] font-black uppercase text-gray-400 tracking-widest text-right">Ação Manual</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredClientes.map((cliente) => {
                                const isSelected = selectedClients.includes(cliente.cliente_whatsapp);
                                const ausente = isAusente(cliente.ultima_compra);
                                return (
                                    <tr key={cliente.cliente_whatsapp} className={`transition-colors group ${isSelected ? 'bg-primary/5' : 'hover:bg-gray-50/30'}`}>
                                        <td className="px-6 py-5">
                                            <button onClick={() => toggleSelect(cliente.cliente_whatsapp)} className={`transition-colors ${isSelected ? 'text-primary' : 'text-gray-200 group-hover:text-gray-400'}`}>
                                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg ${ausente ? 'bg-red-50 text-red-300' : 'bg-gray-50 text-gray-300'}`}>
                                                    {(cliente.nome || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-gray-800 text-sm tracking-tight">{cliente.nome || 'Sem Nome'}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-bold text-gray-400">{cliente.cliente_whatsapp}</span>
                                                        {ausente && <span className="bg-red-100 text-red-600 text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">CLIENTE AUSENTE</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="font-black text-gray-900">R$ {Number(cliente.total_gasto).toFixed(2).replace('.', ',')}</span>
                                            <span className="text-[9px] font-bold text-gray-400 block tracking-widest uppercase">{cliente.total_pedidos} PEDIDOS</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-gray-500 font-bold text-[10px] uppercase">{new Date(cliente.ultima_compra).toLocaleDateString()}</span>
                                        </td>
                                        <td className="px-6 py-5 text-right flex items-center justify-end gap-2">
                                            {store?.plano_tipo !== 'START' && (
                                                <button 
                                                    onClick={() => handleOpenHistory(cliente.cliente_whatsapp)}
                                                    className="p-2.5 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all shadow-sm"
                                                    title="Histórico Completo"
                                                >
                                                    <History size={16} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => window.open(`https://wa.me/55${cliente.cliente_whatsapp.replace(/\D/g, '')}`, '_blank')}
                                                className="p-2.5 bg-green-50 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="WhatsApp Direto"
                                            >
                                                <MessageCircle size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClient(cliente.cliente_whatsapp, cliente.nome)}
                                                className="p-2.5 text-gray-300 hover:text-red-500 transition-colors"
                                                title="Excluir do CRM"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bulk Sending Modal Overlay */}
            {isBulkSending && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xl z-[150] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-white/20 animate-scale-up">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tighter italic uppercase italic">Campanha em Progresso</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Disparador Evolution API v2</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setBulkStatus('idle');
                                    setIsBulkSending(false);
                                }} 
                                className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            {/* Main Progress Ring / Info */}
                            <div className="flex items-center justify-center gap-10">
                                <div className="relative w-40 h-40 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100" />
                                        <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * bulkProgress) / 100} className="text-primary transition-all duration-500 ease-out" />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-4xl font-black text-gray-900">{bulkProgress}%</span>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{currentSendingIdx}/{selectedClients.length}</span>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Mensagem Atual:</p>
                                        <p className="text-base font-black text-gray-800 leading-tight">
                                           {bulkStatus === 'finished' ? 'Disparo Finalizado!' : (clientes.find(c => c.cliente_whatsapp === selectedClients[currentSendingIdx])?.nome || 'Cliente')}
                                        </p>
                                        <div className="mt-4 flex items-center gap-2">
                                            {bulkStatus === 'waiting' && (
                                                <>
                                                    <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-orange-400 animate-pulse" style={{width: `${(countdown/15)*100}%`}}></div>
                                                    </div>
                                                    <span className="text-[10px] font-black text-orange-500 uppercase tabular-nums">Aguardando {countdown}s</span>
                                                </>
                                            )}
                                            {bulkStatus === 'sending' && <span className="text-[10px] font-black text-primary uppercase animate-pulse">Disparando pela Evolution...</span>}
                                            {bulkStatus === 'finished' && <span className="text-[10px] font-black text-green-500 uppercase flex items-center gap-1"><CheckCircle2 size={12} /> Sucesso Total</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Logs */}
                            <div className="bg-gray-900 rounded-2xl p-6 h-48 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-2">
                                {bulkLogs.map((log, i) => (
                                    <div key={i} className="flex items-center gap-2 border-b border-white/5 pb-2">
                                        <span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span>
                                        <span className="text-white font-bold">{log.name}</span>
                                        <span className={log.status === 'ok' ? 'text-green-500' : 'text-red-500'}>{log.status === 'ok' ? 'ENVIO_OK' : 'FALHA_ENVIO'}</span>
                                    </div>
                                ))}
                                {bulkStatus !== 'finished' && <div className="animate-pulse text-primary">{'>'} Aguardando próximo comando...</div>}
                            </div>

                            {bulkStatus === 'finished' && (
                                <button 
                                    onClick={() => { setIsBulkSending(false); setSelectedClients([]); }} 
                                    className="w-full py-5 bg-gray-900 text-white font-black text-[12px] uppercase tracking-[0.3em] rounded-2xl hover:bg-black transition-all"
                                >
                                    CONCLUIR E VOLTAR PARA CRM
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md animate-slide-up overflow-hidden border border-gray-100">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="font-black text-gray-900 uppercase tracking-tighter italic text-xl">Configurações CRM</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Automação Evolution API</p>
                            </div>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-gray-300 hover:text-red-500 rounded-xl transition-colors"><X size={24} /></button>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Regra de Ausência (Dias)</label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="range" min="7" max="90" step="1" 
                                        value={crmDays} 
                                        onChange={e => setCrmDays(Number(e.target.value))}
                                        className="flex-1 accent-primary" 
                                    />
                                    <span className="bg-primary/10 text-primary w-14 py-2 rounded-xl text-center font-black text-sm">{crmDays}d</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Template de Mensagem</label>
                                <textarea
                                    value={crmMsg}
                                    onChange={e => setCrmMsg(e.target.value)}
                                    placeholder="Ex: Olá {nome}! Notamos que você sumiu..."
                                    className="w-full p-4 bg-gray-50 text-gray-800 rounded-2xl focus:border-primary outline-none text-[11px] font-medium h-32 resize-none"
                                />
                                <p className="text-[9px] text-gray-400 italic">* Use a tag <strong>{'{nome}'}</strong> para personalizar.</p>
                            </div>

                            <button 
                                onClick={handleSaveSettings}
                                disabled={isSaving}
                                className="w-full py-5 bg-primary text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                SALVAR CONFIGURAÇÕES
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Histórico */}
            {isHistoryModalOpen && selectedClientDetail && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsHistoryModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                        
                        {/* Header Modal */}
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                                    <Users size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">{selectedClientDetail.perfil.nome || 'Cliente'}</h2>
                                    <p className="text-gray-400 font-bold text-[10px] tracking-widest uppercase items-center flex gap-2">
                                        <Phone size={12} /> {selectedClientDetail.perfil.whatsapp}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="p-3 hover:bg-white rounded-2xl text-gray-400 transition-all shadow-sm">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* Coluna Esquerda: Notas e Observações */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="text-primary" size={20} />
                                    <h3 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Observações Permanentes</h3>
                                </div>
                                <textarea
                                    value={tempNotes}
                                    onChange={(e) => setTempNotes(e.target.value)}
                                    placeholder="Adicione notas sobre este cliente... Ex: Gosta de massa bem passada, mora em prédio, etc."
                                    className="w-full h-48 p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:border-primary outline-none text-sm font-medium resize-none transition-all"
                                />
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isSavingProfile}
                                    className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSavingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    SALVAR ANOTAÇÕES
                                </button>
                                
                                <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl space-y-3">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="text-blue-500" size={16} />
                                        <span className="font-black text-blue-900 text-[10px] uppercase tracking-widest">Resumo Financeiro</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/50 p-3 rounded-xl border border-blue-100">
                                            <p className="text-[9px] font-bold text-blue-400 uppercase">Total de Pedidos</p>
                                            <p className="text-xl font-black text-blue-900">{selectedClientDetail.historico.length}</p>
                                        </div>
                                        <div className="bg-white/50 p-3 rounded-xl border border-blue-100">
                                            <p className="text-[9px] font-bold text-blue-400 uppercase">Valor Total Gasto</p>
                                            <p className="text-xl font-black text-blue-900">R$ {selectedClientDetail.historico.reduce((acc, curr) => acc + Number(curr.total), 0).toFixed(2).replace('.', ',')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Coluna Direita: Linha do Tempo de Pedidos */}
                            <div className="flex flex-col h-full overflow-hidden min-h-0">
                                <div className="flex items-center gap-2 mb-6">
                                    <Clock className="text-primary" size={20} />
                                    <h3 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Histórico de Atividade</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar" style={{maxHeight: 'calc(90vh - 200px)'}}>
                                    {selectedClientDetail.historico.length === 0 ? (
                                        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                                            <ShoppingBag className="mx-auto text-gray-200 mb-4" size={48} />
                                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nenhum pedido encontrado</p>
                                        </div>
                                    ) : (
                                        selectedClientDetail.historico.map((pedido) => (
                                            <div key={pedido.id} className="bg-white border border-gray-100 rounded-3xl hover:border-primary/20 transition-all group overflow-hidden shadow-sm hover:shadow-md">
                                                <div 
                                                    className="p-5 flex items-center justify-between cursor-pointer"
                                                    onClick={() => {
                                                        const el = document.getElementById(`items-${pedido.id}`);
                                                        const chevronDown = document.getElementById(`chevron-down-${pedido.id}`);
                                                        const chevronUp = document.getElementById(`chevron-up-${pedido.id}`);
                                                        if (el) {
                                                            el.classList.toggle('hidden');
                                                            chevronDown?.classList.toggle('hidden');
                                                            chevronUp?.classList.toggle('hidden');
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-primary/5 transition-colors text-gray-400 group-hover:text-primary">
                                                            <ShoppingBag size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[11px] font-black text-gray-900 uppercase">Pedido #{pedido.id}</p>
                                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                                                                    pedido.status === 'FINALIZADO' ? 'bg-green-100 text-green-600' : 
                                                                    pedido.status === 'CANCELADO' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                                                }`}>
                                                                    {pedido.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                                                {new Date(pedido.criado_em).toLocaleDateString()} • {new Date(pedido.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-none mb-1">Total</p>
                                                            <p className="font-black text-gray-900 text-base italic">R$ {Number(pedido.total).toFixed(2).replace('.', ',')}</p>
                                                        </div>
                                                        <div className="text-gray-300 group-hover:text-primary transition-colors">
                                                            <ChevronDown size={20} id={`chevron-down-${pedido.id}`} />
                                                            <ChevronUp size={20} id={`chevron-up-${pedido.id}`} className="hidden" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Lista Coapsível de Itens */}
                                                <div id={`items-${pedido.id}`} className="hidden bg-gray-50/50 border-t border-gray-50 p-6">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="w-1 h-3 bg-primary rounded-full"></div>
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Itens do Pedido</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {pedido.itens?.map((it, idx) => (
                                                            <span 
                                                                key={idx} 
                                                                className="text-[10px] font-bold text-gray-600 bg-white border border-gray-100 px-2.5 py-1 rounded-xl shadow-sm"
                                                            >
                                                                {it.quantidade}x {it.produto_nome}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
