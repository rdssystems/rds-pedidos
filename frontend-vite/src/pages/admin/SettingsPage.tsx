import React, { useState, useEffect } from 'react';
import {
    Save,
    Palette,
    Smartphone,
    Globe,
    Upload,
    CheckCircle2,
    Eye,
    MapPin,
    Clock,
    Truck,
    Plus,
    Trash2,
    QrCode
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { useBilling } from '@/context/BillingContext';

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
    const { refreshBilling } = useBilling();
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

    // Delivery Settings
    const [tipoTaxaEntrega, setTipoTaxaEntrega] = useState<'FIXA' | 'BAIRRO'>('FIXA');
    const [taxaEntregaFixa, setTaxaEntregaFixa] = useState<string>('0.00');
    const [bairros, setBairros] = useState<any[]>([]);
    const [novoBairroNome, setNovoBairroNome] = useState('');
    const [novoBairroTaxa, setNovoBairroTaxa] = useState('');
    const [isAddingBairro, setIsAddingBairro] = useState(false);

    // QR & Catalog Settings
    const [modoCatalogo, setModoCatalogo] = useState(false);
    const [quantidadeMesas, setQuantidadeMesas] = useState(0);
    const [showQRs, setShowQRs] = useState(false);

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

    const getImageUrl = (url: string | null) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
        return `${baseUrl}${url}`;
    };

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
                const response = await fetch(`/api/lojas/?_t=${new Date().getTime()}`, {
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
                    setLogoPreview(getImageUrl(s.logo));
                    setBannerPreview(getImageUrl(s.banner));

                    // Delivery
                    setTipoTaxaEntrega(s.tipo_taxa_entrega || 'FIXA');
                    setTaxaEntregaFixa(s.taxa_entrega_fixa ? parseFloat(s.taxa_entrega_fixa).toFixed(2) : '0.00');
                    setBairros(s.bairros_entrega || []);

                    // QR & Catalog
                    setModoCatalogo(s.modo_catalogo || false);
                    setQuantidadeMesas(s.quantidade_mesas || 0);
                    if (s.quantidade_mesas > 0) setShowQRs(true);
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
            formData.append('tipo_taxa_entrega', tipoTaxaEntrega);
            formData.append('taxa_entrega_fixa', taxaEntregaFixa.replace(',', '.'));
            formData.append('modo_catalogo', String(modoCatalogo));
            formData.append('quantidade_mesas', String(quantidadeMesas));

            if (logoFile) formData.append('logo', logoFile);
            if (bannerFile) formData.append('banner', bannerFile);

            const token = localStorage.getItem('token');
            const res = await fetch(`/api/lojas/${storeSlug}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                setSaved(true);
                refreshBilling();
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

    const handleAddBairro = async () => {
        if (!novoBairroNome || !novoBairroTaxa) return;
        setIsAddingBairro(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/bairros/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nome: novoBairroNome,
                    taxa: parseFloat(novoBairroTaxa.replace(',', '.'))
                })
            });
            if (response.ok) {
                const newBairro = await response.json();
                setBairros([...bairros, newBairro]);
                setNovoBairroNome('');
                setNovoBairroTaxa('');
            }
        } catch (err) {
            console.error('Error adding bairro:', err);
        } finally {
            setIsAddingBairro(false);
        }
    };

    const handleRemoveBairro = async (id: number) => {
        if (!confirm('Deseja realmente remover este bairro?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/bairros/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setBairros(bairros.filter(b => b.id !== id));
            }
        } catch (err) {
            console.error('Error removing bairro:', err);
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
        let newTime = part === 'hour' ? `${val}:${m}` : `${h}:${val}`;
        updateSchedule(day, type, newTime);
    };

    const getCatalogUrl = (mesa?: number) => {
        if (!storeSlug) return '';
        const port = window.location.port ? `:${window.location.port}` : '';
        const baseUrl = `${window.location.protocol}//${window.location.hostname}${port}`;
        
        // For local testing or main app, use /s/ prefix
        const hostname = window.location.hostname;
        const isMainApp = hostname.startsWith('app.') || hostname === 'localhost' || hostname === '127.0.0.1';
        
        const path = isMainApp ? `/s/${storeSlug}` : '/';
        const query = mesa !== undefined ? `?mesa=${mesa}` : '';
        
        return `${baseUrl}${path}${query}`;
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
                            className="bg-primary text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 flex-1 md:flex-none"
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
                    {/* Link do Cardápio */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 shadow-xl text-white space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <Globe size={120} />
                        </div>

                        <div className="flex items-center gap-3 border-l-4 border-primary pl-4 relative z-10">
                            <Globe size={24} className="text-primary" />
                            <h2 className="text-xl font-bold uppercase italic">Link do Cardápio Digital</h2>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <p className="text-gray-400 text-sm font-medium italic italic">Este é o endereço que seus clientes usarão para acessar seu cardápio.</p>

                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-xl backdrop-blur-sm">
                                <div className="flex-1 px-4 py-2 truncate font-mono text-primary font-bold text-sm lowercase">
                                    {!storeSlug ? <span className="animate-pulse opacity-50 italic">Carregando...</span> : getCatalogUrl()}
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(getCatalogUrl());
                                        alert('Link copiado!');
                                    }}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center gap-2 group/btn"
                                >
                                    <Globe size={16} className="text-white group-hover/btn:text-primary transition-colors" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Copiar</span>
                                </button>
                                <button
                                    onClick={() => window.open(getCatalogUrl(), '_blank')}
                                    className="px-4 py-2 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-105 transition-transform"
                                >
                                    <Eye size={16} /> Ver Loja
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Identidade Visual */}
                    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                            <Palette className="text-primary" />
                            <h2 className="text-xl font-bold text-gray-900 uppercase italic">Identidade Visual</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nome da Loja</label>
                                    <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">WhatsApp</label>
                                    <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                    <MapPin size={14} className="text-primary" /> Endereço Completo
                                </label>
                                <textarea value={endereco} onChange={(e) => setEndereco(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium min-h-[80px]" />
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Imagem de Capa (Banner)</label>
                                <input type="file" id="store-banner" className="hidden" accept="image/*" onChange={handleBannerChange} />
                                <div onClick={() => document.getElementById('store-banner')?.click()} className="border-2 border-dashed border-gray-200 rounded-xl h-[160px] flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden">
                                    {bannerPreview ? (
                                        <>
                                            <img src={bannerPreview} className="absolute inset-0 w-full h-full object-cover" alt="Banner" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10"><Upload size={24} className="text-white" /></div>
                                        </>
                                    ) : (
                                        <><Upload size={32} className="text-gray-300 group-hover:text-primary transition-colors" /><span className="text-xs font-bold text-gray-400">1200x400px</span></>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Cores</label>
                                    <div className="flex gap-3">
                                        <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white shadow-sm" />
                                        <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white shadow-sm" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Logo</label>
                                    <input type="file" id="store-logo" className="hidden" accept="image/*" onChange={handleLogoChange} />
                                    <div onClick={() => document.getElementById('store-logo')?.click()} className="border-2 border-dashed border-gray-200 rounded-xl h-[48px] w-48 flex items-center justify-center cursor-pointer relative overflow-hidden">
                                        {logoPreview ? <img src={logoPreview} className="h-full object-contain p-1" alt="Logo" /> : <Upload size={20} className="text-gray-300" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Horários */}
                    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-gray-800 pl-4">
                            <Clock className="text-gray-800" />
                            <h2 className="text-xl font-bold text-gray-900 uppercase italic">Horários</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {DIAS_SEMANA.map((dia) => {
                                const sched = horario[dia.key];
                                return (
                                    <div key={dia.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <span className="font-bold text-gray-700 text-xs w-24 uppercase">{dia.label}</span>
                                        <div className="flex items-center gap-4">
                                            <input type="checkbox" checked={sched.closed} onChange={(e) => updateSchedule(dia.key, 'closed', e.target.checked)} className="rounded text-primary" />
                                            {!sched.closed && (
                                                <div className="flex items-center gap-1 font-mono text-sm px-2 py-1 bg-white border rounded-lg">
                                                    <input type="text" value={sched.open.split(':')[0]} onChange={(e) => updateTime(dia.key, 'open', 'hour', e.target.value)} className="w-6 text-center" />:
                                                    <input type="text" value={sched.open.split(':')[1]} onChange={(e) => updateTime(dia.key, 'open', 'minute', e.target.value)} className="w-6 text-center" />
                                                    <span className="mx-1 opacity-40">-</span>
                                                    <input type="text" value={sched.close.split(':')[0]} onChange={(e) => updateTime(dia.key, 'close', 'hour', e.target.value)} className="w-6 text-center" />:
                                                    <input type="text" value={sched.close.split(':')[1]} onChange={(e) => updateTime(dia.key, 'close', 'minute', e.target.value)} className="w-6 text-center" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* QR Codes */}
                    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-indigo-500 pl-4">
                            <QrCode className="text-indigo-500" />
                            <h2 className="text-xl font-bold text-gray-900 uppercase italic">QR Codes</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <input type="number" value={quantidadeMesas} onChange={(e) => setQuantidadeMesas(parseInt(e.target.value) || 0)} className="w-20 px-4 py-2 bg-gray-50 border rounded-xl font-bold" />
                            <button onClick={() => setShowQRs(true)} className="bg-indigo-500 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px]">Gerar QRs</button>
                        </div>
                        {showQRs && (
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
                                {Array.from({ length: Math.max(1, quantidadeMesas) }, (_, i) => i + (quantidadeMesas > 0 ? 1 : 0)).map(mesa => (
                                    <div key={mesa} className="bg-white p-4 rounded-xl flex flex-col items-center gap-3 shadow-sm">
                                        <QRCode value={mesa === 0 ? getCatalogUrl() : getCatalogUrl(mesa)} size={100} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{mesa === 0 ? 'Balcão' : `Mesa ${mesa}`}</span>
                                    </div>
                                ))}
                           </div>
                        )}
                    </div>
                </div>

                {/* Preview Mobile */}
                <div className="lg:col-span-5 hidden lg:block sticky top-32 h-fit">
                    <div className="bg-gray-900 rounded-[2.5rem] p-4 shadow-2xl border-[10px] border-gray-800 relative aspect-[9/18]">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-[2rem] z-20"></div>
                        <div className="h-full w-full bg-white rounded-xl overflow-hidden flex flex-col shadow-inner" style={{ backgroundColor: secondaryColor }}>
                            <div className="pt-10 pb-6 px-6 text-center text-white" style={{ backgroundColor: primaryColor }}>
                                <div className="w-16 h-16 bg-white rounded-xl mx-auto shadow-xl flex items-center justify-center overflow-hidden border-2 border-white/20">
                                    {logoPreview && <img src={logoPreview} className="h-full object-contain" alt="Logo preview" />}
                                </div>
                                <h3 className="font-black text-sm italic uppercase mt-3">{storeName}</h3>
                            </div>
                            <div className="p-4 flex-1 space-y-4">
                                <div className="h-4 w-24 bg-gray-100 rounded-full" style={{ borderLeft: `4px solid ${primaryColor}` }}></div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[1, 2].map(i => (
                                        <div key={i} className="bg-white p-2 rounded-xl shadow-sm space-y-2">
                                            <div className="h-20 bg-gray-100 rounded-xl"></div>
                                            <div className="h-2 w-12 bg-gray-50 rounded-full"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-4 border-t"><div className="w-full py-3 rounded-xl shadow-lg text-white font-black uppercase text-[10px] text-center" style={{ backgroundColor: primaryColor }}>Pedir Agora</div></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
