'use client';

import React, { useState, useEffect } from 'react';
import {
    Save,
    Palette,
    Smartphone,
    Globe,
    Upload,
    ChevronRight,
    CheckCircle2,
    Eye,
    MapPin,
    Clock
} from 'lucide-react';

const DIAS_SEMANA = [
    { key: 'seg', label: 'Segunda-feira' },
    { key: 'ter', label: 'Terça-feira' },
    { key: 'qua', label: 'Quarta-feira' },
    { key: 'qui', label: 'Quinta-feira' },
    { key: 'sex', label: 'Sexta-feira' },
    { key: 'sab', label: 'Sábado' },
    { key: 'dom', label: 'Domingo' },
];

export default function StoreSettings() {
    const [storeId, setStoreId] = useState<number | null>(null);
    const [storeSlug, setStoreSlug] = useState<string | null>(null);
    const [storeName, setStoreName] = useState('Minha Loja');
    const [primaryColor, setPrimaryColor] = useState('#ef4444');
    const [secondaryColor, setSecondaryColor] = useState('#ffffff');
    const [whatsapp, setWhatsapp] = useState('');
    const [endereco, setEndereco] = useState('');

    // Notification Settings
    const [notificarPreparo, setNotificarPreparo] = useState(true);
    const [notificarEntrega, setNotificarEntrega] = useState(true);
    const [notificarFinalizado, setNotificarFinalizado] = useState(true);

    const [msgPreparo, setMsgPreparo] = useState('Olá {cliente}! 👨‍🍳 Seu pedido #{numero} começou a ser preparado em *{loja}*. Em breve avisaremos quando sair para entrega!');
    const [msgEntrega, setMsgEntrega] = useState('Olá {cliente}! 🛵 Seu pedido #{numero} de *{loja}* saiu para entrega! Fique atento(a).');
    const [msgFinalizado, setMsgFinalizado] = useState('Pedido #{numero} de *{loja}* concluído. Obrigado pela preferência, {cliente}! ⭐');

    type DaySchedule = {
        open: string;
        close: string;
        closed: boolean;
    };

    const [horario, setHorario] = useState<Record<string, DaySchedule>>({
        seg: { open: '08:00', close: '18:00', closed: false },
        ter: { open: '08:00', close: '18:00', closed: false },
        qua: { open: '08:00', close: '18:00', closed: false },
        qui: { open: '08:00', close: '18:00', closed: false },
        sex: { open: '08:00', close: '18:00', closed: false },
        sab: { open: '08:00', close: '18:00', closed: false },
        dom: { open: '00:00', close: '00:00', closed: true }
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = ['00', '15', '30', '45'];

    const parseSchedule = (data: any): Record<string, DaySchedule> => {
        const newSchedule: Record<string, DaySchedule> = {};
        DIAS_SEMANA.forEach(d => {
            const val = data[d.key];
            if (typeof val === 'string') {
                if (val.toLowerCase() === 'fechado') {
                    newSchedule[d.key] = { open: '00:00', close: '00:00', closed: true };
                } else if (val.includes('-')) {
                    const [open, close] = val.split('-');
                    newSchedule[d.key] = { open: open.trim(), close: close.trim(), closed: false };
                } else {
                    newSchedule[d.key] = { open: '08:00', close: '18:00', closed: false };
                }
            } else if (typeof val === 'object' && val !== null) {
                newSchedule[d.key] = val;
            } else {
                newSchedule[d.key] = { open: '08:00', close: '18:00', closed: false };
            }
        });
        return newSchedule;
    };

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/lojas/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                const s = Array.isArray(data) ? data[0] : (data.results ? data.results[0] : data);
                if (s) {
                    setStoreId(s.id);
                    setStoreSlug(s.slug);
                    setStoreName(s.nome);
                    setPrimaryColor(s.cor_primaria || '#ef4444');
                    setSecondaryColor(s.cor_secundaria || '#ffffff');
                    setWhatsapp(s.whatsapp || '');
                    setEndereco(s.endereco || '');
                    if (s.horario_funcionamento) {
                        setHorario(parseSchedule(s.horario_funcionamento));
                    }
                    setNotificarPreparo(s.notificar_preparo ?? true);
                    setNotificarEntrega(s.notificar_entrega ?? true);
                    setNotificarFinalizado(s.notificar_finalizado ?? true);
                    setMsgPreparo(s.msg_preparo || 'Olá {cliente}! 👨‍🍳 Seu pedido #{numero} começou a ser preparado em *{loja}*. Em breve avisaremos quando sair para entrega!');
                    setMsgEntrega(s.msg_entrega || 'Olá {cliente}! 🛵 Seu pedido #{numero} de *{loja}* saiu para entrega! Fique atento(a).');
                    setMsgFinalizado(s.msg_finalizado || 'Pedido #{numero} de *{loja}* concluído. Obrigado pela preferência, {cliente}! ⭐');
                    setLogoPreview(s.logo);
                    setBannerPreview(s.banner);
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            }
        };
        fetchSettings();
    }, []);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setBannerFile(file);
            setBannerPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!storeSlug) {
            setError('Identificador da loja não encontrado.');
            return;
        }
        setIsSaving(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('nome', storeName);
            formData.append('whatsapp', whatsapp);
            formData.append('endereco', endereco || '');
            formData.append('cor_primaria', primaryColor);
            formData.append('cor_secundaria', secondaryColor);
            formData.append('horario_funcionamento', JSON.stringify(horario));
            formData.append('notificar_preparo', String(notificarPreparo));
            formData.append('notificar_entrega', String(notificarEntrega));
            formData.append('notificar_finalizado', String(notificarFinalizado));
            formData.append('msg_preparo', msgPreparo);
            formData.append('msg_entrega', msgEntrega);
            formData.append('msg_finalizado', msgFinalizado);

            if (logoFile) {
                formData.append('logo', logoFile);
            }
            if (bannerFile) {
                formData.append('banner', bannerFile);
            }

            const token = localStorage.getItem('token');
            // Using slug since look_up is set to slug in backend
            const res = await fetch(`/api/lojas/${storeSlug}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                const data = await res.json();
                setError(JSON.stringify(data));
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao conectar ao servidor');
        } finally {
            setIsSaving(false);
        }
    };

    const updateSchedule = (day: string, field: keyof DaySchedule, value: any) => {
        setHorario(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }));
    };

    const updateTime = (day: string, type: 'open' | 'close', part: 'hour' | 'minute', val: string) => {
        const current = horario[day][type];
        const [h, m] = current.split(':');
        let newTime = current;
        if (part === 'hour') newTime = `${val}:${m}`;
        else newTime = `${h}:${val}`;
        updateSchedule(day, type, newTime);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <header className="bg-white border-b border-gray-200 p-8 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter">Configurações</h1>
                        <p className="text-gray-500 mt-1">Gerencie a identidade e funcionamento da sua loja</p>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        {error && (
                            <div className="text-red-500 text-xs font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100 max-w-xs truncate">
                                Error: {error}
                            </div>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-primary text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 flex-1 md:flex-none"
                        >
                            {isSaving ? <span className="animate-pulse">Salvando...</span> : (
                                <>
                                    {saved ? <CheckCircle2 size={20} /> : <Save size={20} />}
                                    <span>{saved ? 'Salvo!' : 'Salvar Alterações'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-7 space-y-8">
                    {/* Link do Cardápio - NOVO */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-xl text-white space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <Globe size={120} />
                        </div>

                        <div className="flex items-center gap-3 border-l-4 border-primary pl-4 relative z-10">
                            <Globe size={24} className="text-primary" />
                            <h2 className="text-xl font-bold uppercase italic">Link do Cardápio Digital</h2>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <p className="text-gray-400 text-sm font-medium italic">
                                Este é o endereço que seus clientes usarão para acessar seu cardápio e fazer pedidos.
                            </p>

                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl backdrop-blur-sm">
                                <div className="flex-1 px-4 py-2 truncate font-mono text-primary font-bold text-sm lowercase">
                                    {!storeSlug ? (
                                        <span className="animate-pulse opacity-50 italic">Carregando identificador...</span>
                                    ) : (
                                        typeof window !== 'undefined' ? `${window.location.origin}/${storeSlug}` : `/${storeSlug}`
                                    )}
                                </div>
                                <button
                                    disabled={!storeSlug}
                                    onClick={() => {
                                        if (!storeSlug) return;
                                        const url = `${window.location.origin}/${storeSlug}`;
                                        navigator.clipboard.writeText(url);
                                        alert('Link copiado para a área de transferência!');
                                    }}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center gap-2 group/btn disabled:opacity-50"
                                >
                                    <Globe size={16} className="text-white group-hover/btn:text-primary transition-colors" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Copiar</span>
                                </button>
                                <button
                                    disabled={!storeSlug}
                                    onClick={() => {
                                        if (!storeSlug) return;
                                        window.open(`/${storeSlug}`, '_blank');
                                    }}
                                    className="px-4 py-2 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
                                >
                                    <Eye size={16} />
                                    Ver Loja
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Identidade Visual */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                            <Palette className="text-primary" />
                            <h2 className="text-xl font-bold text-gray-900 uppercase italic">Identidade Visual</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nome da Loja</label>
                                    <input
                                        type="text"
                                        value={storeName}
                                        onChange={(e) => setStoreName(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">WhatsApp</label>
                                    <input
                                        type="text"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        placeholder="5511999999999"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed flex items-center gap-2">
                                    <MapPin size={14} className="text-primary" /> Endereço da Loja
                                </label>
                                <textarea
                                    value={endereco}
                                    onChange={(e) => setEndereco(e.target.value)}
                                    placeholder="Rua Exemplo, 123 - Bairro, Cidade - UF"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium min-h-[80px]"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Imagem de Capa (Banner)</label>
                                <input type="file" id="store-banner" className="hidden" accept="image/*" onChange={handleBannerChange} />
                                <div
                                    onClick={() => document.getElementById('store-banner')?.click()}
                                    className="border-2 border-dashed border-gray-200 rounded-3xl h-[160px] flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer group relative overflow-hidden"
                                >
                                    {bannerPreview ? (
                                        <>
                                            <img src={bannerPreview} className="absolute inset-0 w-full h-full object-cover" alt="Banner" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                                                <Upload size={24} className="text-white" />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={32} className="text-gray-300 group-hover:text-primary transition-colors" />
                                            <span className="text-xs font-bold text-gray-400">Recomendado: 1200x400px</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cores da Marca</label>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent" />
                                            <span className="text-xs font-bold text-gray-600 uppercase">Principal</span>
                                        </div>
                                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                            <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent" />
                                            <span className="text-xs font-bold text-gray-600 uppercase">Fundo</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Logotipo</label>
                                    <input type="file" id="store-logo" className="hidden" accept="image/*" onChange={handleLogoChange} />
                                    <div
                                        onClick={() => document.getElementById('store-logo')?.click()}
                                        className="border-2 border-dashed border-gray-200 rounded-2xl h-[100px] flex flex-col items-center justify-center gap-1 hover:bg-gray-50 transition-colors cursor-pointer group relative overflow-hidden"
                                    >
                                        {logoPreview ? (
                                            <>
                                                <img src={logoPreview} className="absolute inset-0 w-full h-full object-cover p-2" alt="Logo" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <Upload size={20} className="text-white" />
                                                </div>
                                            </>
                                        ) : (
                                            <Upload size={24} className="text-gray-300 group-hover:text-primary transition-colors" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Configurações de Notificação - NOVO */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                            <Smartphone className="text-primary" />
                            <h2 className="text-xl font-bold text-gray-900 uppercase italic">Customização de Notificações</h2>
                        </div>

                        <p className="text-gray-500 text-sm font-medium italic">
                            Escolha os eventos e personalize as mensagens que seus clientes receberão via WhatsApp. Use <span className="text-primary font-bold">{'{cliente}'}</span>, <span className="text-primary font-bold">{'{numero}'}</span> e <span className="text-primary font-bold">{'{loja}'}</span> para preenchimento automático.
                        </p>

                        <div className="grid grid-cols-1 gap-6">
                            {/* Preparo */}
                            <div className="space-y-3 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                            <Clock size={20} className="text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm italic uppercase">Início de Preparo</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Enviado quando o pedido entra em PREPARO</p>
                                        </div>
                                    </div>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificarPreparo}
                                            onChange={(e) => setNotificarPreparo(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </div>
                                </div>
                                {notificarPreparo && (
                                    <textarea
                                        value={msgPreparo}
                                        onChange={(e) => setMsgPreparo(e.target.value)}
                                        className="w-full mt-2 p-4 bg-white border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[80px]"
                                        placeholder="Ex: Olá {cliente}! Seu pedido #{numero} está em preparo..."
                                    />
                                )}
                            </div>

                            {/* Entrega */}
                            <div className="space-y-3 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                            <Smartphone size={20} className="text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm italic uppercase">Saída para Entrega</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Enviado quando o pedido mudar para ENTREGA</p>
                                        </div>
                                    </div>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificarEntrega}
                                            onChange={(e) => setNotificarEntrega(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </div>
                                </div>
                                {notificarEntrega && (
                                    <textarea
                                        value={msgEntrega}
                                        onChange={(e) => setMsgEntrega(e.target.value)}
                                        className="w-full mt-2 p-4 bg-white border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[80px]"
                                        placeholder="Ex: Olá {cliente}! Seu pedido #{numero} saiu para entrega!"
                                    />
                                )}
                            </div>

                            {/* Finalizado */}
                            <div className="space-y-3 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                            <CheckCircle2 size={20} className="text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm italic uppercase">Pedido Finalizado</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Enviado quando o pedido for FINALIZADO</p>
                                        </div>
                                    </div>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificarFinalizado}
                                            onChange={(e) => setNotificarFinalizado(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </div>
                                </div>
                                {notificarFinalizado && (
                                    <textarea
                                        value={msgFinalizado}
                                        onChange={(e) => setMsgFinalizado(e.target.value)}
                                        className="w-full mt-2 p-4 bg-white border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[80px]"
                                        placeholder="Ex: Pedido #{numero} finalizado. Obrigado, {cliente}!"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Horários de Funcionamento */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-gray-800 pl-4">
                            <Clock className="text-gray-800" />
                            <h2 className="text-xl font-bold text-gray-900 uppercase italic">Horários de Funcionamento</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {DIAS_SEMANA.map((dia) => {
                                const sched = horario[dia.key];
                                const [openH, openM] = sched.open.split(':');
                                const [closeH, closeM] = sched.close.split(':');

                                return (
                                    <div key={dia.key} className="flex flex-col xl:flex-row xl:items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 gap-3">
                                        <span className="font-bold text-gray-700 text-sm w-32 uppercase tracking-wide">{dia.label}</span>
                                        <div className="flex items-center gap-4 flex-1 flex-wrap">
                                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-primary transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={sched.closed}
                                                    onChange={(e) => updateSchedule(dia.key, 'closed', e.target.checked)}
                                                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                                                />
                                                <span className="text-xs font-bold text-gray-600 uppercase">Fechado</span>
                                            </label>

                                            {!sched.closed && (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200">
                                                        <select
                                                            value={openH}
                                                            onChange={(e) => updateTime(dia.key, 'open', 'hour', e.target.value)}
                                                            className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none cursor-pointer appearance-none px-1"
                                                        >
                                                            {hours.map(h => <option key={h} value={h}>{h}</option>)}
                                                        </select>
                                                        <span className="text-gray-400 font-bold">:</span>
                                                        <select
                                                            value={openM}
                                                            onChange={(e) => updateTime(dia.key, 'open', 'minute', e.target.value)}
                                                            className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none cursor-pointer appearance-none px-1"
                                                        >
                                                            {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                                                        </select>
                                                    </div>

                                                    <span className="text-gray-400 font-black text-xs uppercase">até</span>

                                                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200">
                                                        <select
                                                            value={closeH}
                                                            onChange={(e) => updateTime(dia.key, 'close', 'hour', e.target.value)}
                                                            className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none cursor-pointer appearance-none px-1"
                                                        >
                                                            {hours.map(h => <option key={h} value={h}>{h}</option>)}
                                                        </select>
                                                        <span className="text-gray-400 font-bold">:</span>
                                                        <select
                                                            value={closeM}
                                                            onChange={(e) => updateTime(dia.key, 'close', 'minute', e.target.value)}
                                                            className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none cursor-pointer appearance-none px-1"
                                                        >
                                                            {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Preview Mobile */}
                <div className="lg:col-span-5 h-[calc(100vh-200px)] sticky top-32 hidden lg:block">
                    <div className="h-full bg-gray-900 rounded-[3.5rem] p-4 shadow-2xl border-[10px] border-gray-800 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-800 rounded-b-[2rem] z-20"></div>

                        <div className="h-full w-full bg-white rounded-[2.8rem] overflow-hidden flex flex-col shadow-inner" style={{ backgroundColor: secondaryColor }}>
                            {/* Header Preview */}
                            <div className="pt-12 pb-8 px-6 text-center text-white space-y-3 relative" style={{ backgroundColor: primaryColor }}>
                                <div className="w-20 h-20 bg-white rounded-3xl mx-auto shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white/20">
                                    {logoPreview ? (
                                        <img src={logoPreview} className="w-full h-full object-contain" alt="Logo preview" />
                                    ) : (
                                        <span className="font-black text-3xl italic text-gray-300">L</span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-black text-xl italic uppercase tracking-tighter leading-none mb-1">{storeName}</h3>
                                    <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">{endereco ? endereco.split(',')[0] : 'Endereço da Loja'}</p>
                                </div>
                            </div>

                            {/* Content Preview */}
                            <div className="p-5 flex-1 space-y-6 overflow-y-auto hide-scrollbar">
                                <div className="space-y-3">
                                    <div className="w-24 h-4 bg-gray-100 rounded-full border-l-4" style={{ borderColor: primaryColor }}></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[1, 2].map(i => (
                                            <div key={i} className="bg-white p-3 rounded-3xl shadow-sm border border-gray-50 flex flex-col gap-2">
                                                <div className="w-full h-24 bg-gray-100 rounded-2xl relative overflow-hidden">
                                                    <div className="absolute bottom-2 left-2 w-10 h-4 bg-white/80 rounded-lg"></div>
                                                </div>
                                                <div className="w-4/5 h-2 bg-gray-100 rounded-full"></div>
                                                <div className="w-1/2 h-3 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Schedule Preview */}
                                <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 space-y-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Horários de hoje</p>
                                    <div className="flex justify-between items-center text-[11px] font-bold text-gray-600">
                                        <span>Status</span>
                                        <span className="text-green-500 bg-green-50 px-2 py-0.5 rounded-full">Aberto</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions Preview */}
                            <div className="p-5 bg-white border-t border-gray-50">
                                <div className="w-full py-4 text-white rounded-2xl flex justify-center items-center font-black uppercase text-xs shadow-xl shadow-primary/20" style={{ backgroundColor: primaryColor }}>
                                    Pedir pelo WhatsApp
                                </div>
                            </div>
                        </div>

                        <div className="absolute -right-12 top-20 bg-white/10 backdrop-blur-xl p-4 rounded-3xl border border-white/20 flex items-center gap-3 text-white shadow-2xl animate-bounce">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Auto-Preview</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
