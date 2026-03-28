import React, { useState, useEffect } from 'react';
import {
    MessageSquare,
    RefreshCw,
    ShieldCheck,
    Smartphone,
    QrCode,
    XCircle,
    CheckCircle2,
    Info,
    ArrowRight
} from 'lucide-react';

export default function WhatsAppPage() {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'loading'>('loading');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [instanceName, setInstanceName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/lojas/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const store = Array.isArray(data) ? data[0] : (data.results ? data.results[0] : data);

            if (store) {
                setInstanceName(store.slug);
                if (store.evolution_instance) {
                    const statusRes = await fetch(`/api/lojas/${store.slug}/whatsapp-status/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const statusData = await statusRes.json();

                    if (statusData.status === 'connected') {
                        setStatus('connected');
                        setQrCode(null);
                    } else {
                        setStatus(statusData.status);
                        if (statusData.qrCode) {
                            const qr = statusData.qrCode.startsWith('data:')
                                ? statusData.qrCode
                                : `data:image/png;base64,${statusData.qrCode}`;
                            setQrCode(qr);
                        }
                    }
                } else {
                    setStatus('disconnected');
                }
            }
        } catch (err) {
            console.error('Error fetching WhatsApp status:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();

        // Auto-refresh status every 5 seconds if connecting to detect scan
        const interval = setInterval(() => {
            if (status === 'connecting') {
                fetchStatus();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [status, instanceName]);

    const handleConnect = async () => {
        setStatus('connecting');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/lojas/${instanceName}/whatsapp-connect/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.qrCode) {
                const qr = data.qrCode.startsWith('data:')
                    ? data.qrCode
                    : `data:image/png;base64,${data.qrCode}`;
                setQrCode(qr);
            }
        } catch (err) {
            console.error('Error connecting WhatsApp:', err);
            setStatus('disconnected');
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/lojas/${instanceName}/whatsapp-disconnect/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setStatus('disconnected');
            setQrCode(null);
        } catch (err) {
            console.error('Error disconnecting WhatsApp:', err);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-6">
                {/* Status Card */}
                <div className="lg:col-span-7 space-y-8">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 rounded-xl ${status === 'connected' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <Smartphone size={32} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status da Conexão</p>
                                        <h2 className={`text-2xl font-black italic uppercase tracking-tighter ${status === 'connected' ? 'text-green-600' : 'text-gray-900'}`}>
                                            {status === 'connected' ? 'Conectado' : status === 'connecting' ? 'Aguardando QR Code' : 'Desconectado'}
                                        </h2>
                                    </div>
                                </div>
                                {status === 'connected' && (
                                    <CheckCircle2 className="text-green-500" size={32} />
                                )}
                            </div>

                            {status === 'disconnected' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex gap-4">
                                        <Info className="text-blue-500 shrink-0" />
                                        <p className="text-sm text-blue-700 leading-relaxed font-medium italic">
                                            Para começar a enviar notificações, você precisa vincular um número de WhatsApp.
                                            Clique no botão abaixo para gerar um QR Code.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleConnect}
                                        className="w-full py-5 bg-primary text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                                    >
                                        <QrCode size={24} />
                                        Gerar QR Code de Conexão
                                    </button>
                                </div>
                            )}

                            {status === 'connecting' && (
                                <div className="flex flex-col items-center space-y-8 py-4 animate-in fade-in zoom-in duration-500">
                                    {qrCode ? (
                                        <div className="relative p-6 bg-white border-4 border-gray-900 rounded-[2.5rem] shadow-2xl shadow-gray-200">
                                            <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                                            <div className="absolute -top-3 -right-3 bg-primary text-white p-3 rounded-full animate-bounce shadow-lg">
                                                <RefreshCw size={20} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 py-12">
                                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-b-transparent"></div>
                                            <p className="text-gray-400 font-black animate-pulse uppercase tracking-widest text-[10px]">Gerando QR Code Seguro...</p>
                                        </div>
                                    )}

                                    <div className="text-center space-y-2">
                                        <p className="font-black italic uppercase tracking-tight text-gray-900">Aponte a câmera do seu WhatsApp</p>
                                        <p className="text-xs text-gray-400 font-medium italic">Configurações &gt; Aparelhos Conectados &gt; Conectar um Aparelho</p>
                                    </div>

                                    <button
                                        onClick={async () => {
                                            if (instanceName) {
                                                const token = localStorage.getItem('token');
                                                setStatus('loading');
                                                try {
                                                    await fetch(`/api/lojas/${instanceName}/whatsapp-disconnect/`, {
                                                        method: 'POST',
                                                        headers: { 'Authorization': `Bearer ${token}` }
                                                    });
                                                } catch (e) { }
                                                setStatus('disconnected');
                                                setQrCode(null);
                                            }
                                        }}
                                        className="mt-4 px-8 py-3 border-2 border-red-100 text-red-500 rounded-xl font-black uppercase italic tracking-widest text-xs hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
                                    >
                                        Problemas no QR Code? Resetar Conexão
                                    </button>
                                </div>
                            )}

                            {status === 'connected' && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-6 rounded-xl space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Instância</p>
                                            <p className="font-black italic text-gray-900 uppercase">{instanceName}</p>
                                        </div>
                                        <div className="bg-gray-50 p-6 rounded-xl space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Segurança</p>
                                            <p className="font-black italic text-green-600 uppercase">Encriptado</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleDisconnect}
                                        className="w-full py-5 border-2 border-red-100 text-red-500 rounded-xl font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-3"
                                    >
                                        <XCircle size={24} />
                                        Desconectar WhatsApp
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Features Card */}
                    <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white space-y-8">
                        <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                            <ShieldCheck className="text-primary" /> Funcionalidades Ativas
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex gap-4">
                                <div className="bg-white/10 p-3 rounded-xl shrink-0 h-fit">
                                    <MessageSquare size={20} className="text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black uppercase italic tracking-widest text-xs">Aviso de Novo Pedido</p>
                                    <p className="text-xs text-white/60 leading-relaxed font-medium italic">Notificamos o cliente assim que você recebe o pedido.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-white/10 p-3 rounded-xl shrink-0 h-fit">
                                    <RefreshCw size={20} className="text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black uppercase italic tracking-widest text-xs">Status em Tempo Real</p>
                                    <p className="text-xs text-white/60 leading-relaxed font-medium italic">Mantenha o cliente informado sobre o preparo e entrega.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side Info */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="bg-gradient-to-br from-primary to-orange-600 rounded-[2.5rem] p-10 text-white shadow-xl shadow-primary/20">
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-tight mb-4">
                            Turbine suas vendas com notificações
                        </h3>
                        <p className="text-white/80 font-medium italic leading-relaxed mb-8">
                            Lojas que utilizam notificações automáticas via WhatsApp têm uma taxa de fidelização 40% maior.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 bg-white/10 p-4 rounded-xl border border-white/10">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-black italic">01</div>
                                <span className="font-bold text-sm tracking-tight italic uppercase">Otimização de tempo</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 p-4 rounded-xl border border-white/10">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-black italic">02</div>
                                <span className="font-bold text-sm tracking-tight italic uppercase">Satisfação do cliente</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 p-4 rounded-xl border border-white/10">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-black italic">03</div>
                                <span className="font-bold text-sm tracking-tight italic uppercase">Redução de suporte</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-2 border-gray-100 rounded-[2.5rem] space-y-6 bg-white">
                        <h4 className="font-black uppercase italic tracking-tighter text-gray-900 flex items-center gap-2 underline decoration-primary decoration-4 underline-offset-4">
                            Precisa de ajuda?
                        </h4>
                        <p className="text-sm text-gray-500 leading-relaxed font-medium italic">
                            Se estiver com problemas para conectar sua conta, entre em contato com nosso suporte técnico ou consulte nossa documentação.
                        </p>
                        <button className="flex items-center gap-2 font-black uppercase italic tracking-widest text-xs text-primary group">
                            Ver Documentação <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
