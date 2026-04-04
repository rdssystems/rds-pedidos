import React, { useState, useEffect } from 'react';
import {
    X,
    Printer,
    Download,
    Monitor,
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
    QrCode,
    Bot,
    Sparkles,
    Brain,
    Bell,
    MessageSquare
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
    const { store, refreshBilling } = useBilling();
    const [storeId, setStoreId] = useState<number | null>(null);
    const [storeSlug, setStoreSlug] = useState<string | null>(null);
    const [storeName, setStoreName] = useState('Minha Loja');
    const [primaryColor, setPrimaryColor] = useState('#ef4444');
    const [secondaryColor, setSecondaryColor] = useState('#ffffff');
    const [whatsapp, setWhatsapp] = useState('');
    const [endereco, setEndereco] = useState('');

    // Notification Settings
    const [notificarRecebido, setNotificarRecebido] = useState(true);
    const [notificarPreparo, setNotificarPreparo] = useState(true);
    const [notificarPronto, setNotificarPronto] = useState(true);
    const [notificarEntrega, setNotificarEntrega] = useState(true);
    const [notificarFinalizado, setNotificarFinalizado] = useState(true);
    const [notificarCancelado, setNotificarCancelado] = useState(true);

    const [msgRecebido, setMsgRecebido] = useState('Olá {cliente}! 👋 Recebemos seu pedido #{numero} em *{loja}*. Já estamos analisando!');
    const [msgPreparo, setMsgPreparo] = useState('Olá {cliente}! 👨‍🍳 Seu pedido #{numero} começou a ser preparado em *{loja}*. Em breve avisaremos quando sair para entrega!');
    const [msgPronto, setMsgPronto] = useState('Olá {cliente}! ✅ Seu pedido #{numero} de *{loja}* está pronto!');
    const [msgEntrega, setMsgEntrega] = useState('Olá {cliente}! 🛵 Seu pedido #{numero} de *{loja}* saiu para entrega! Fique atento(a).');
    const [msgFinalizado, setMsgFinalizado] = useState('Pedido #{numero} de *{loja}* concluído. Obrigado pela preferência, {cliente}! ⭐');
    const [msgCancelado, setMsgCancelado] = useState('Olá {cliente}, seu pedido #{numero} em *{loja}* foi cancelado. Se tiver dúvidas, entre em contato conosco.');

    // AI Bot Settings
    const [botAtivoWhatsapp, setBotAtivoWhatsapp] = useState(false);
    const [botPersonalidade, setBotPersonalidade] = useState('');
    const [botConhecimento, setBotConhecimento] = useState('');
    const [botAlertaTransbordo, setBotAlertaTransbordo] = useState(true);

    // Delivery Settings
    const [tipoTaxaEntrega, setTipoTaxaEntrega] = useState<'FIXA' | 'BAIRRO'>('FIXA');
    const [taxaEntregaFixa, setTaxaEntregaFixa] = useState<string>('0.00');
    const [bairros, setBairros] = useState<any[]>([]);
    const [novoBairroNome, setNovoBairroNome] = useState('');
    const [novoBairroTaxa, setNovoBairroTaxa] = useState('');
    const [isAddingBairro, setIsAddingBairro] = useState(false);

    // QR & Catalog Settings
    const [modoCatalogo, setModoCatalogo] = useState(false);
    const [permitirPedidoMesa, setPermitirPedidoMesa] = useState(false);
    const [modoCatalogoMesa, setModoCatalogoMesa] = useState(false);
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

    // CRM Settings
    const [crmDiasAusente, setCrmDiasAusente] = useState(7);
    const [crmMsgAusente, setCrmMsgAusente] = useState('');

    // Electron specific
    const [isElectron] = useState((window as any).electron?.isElectron || false);
    const [printers, setPrinters] = useState<any[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState(localStorage.getItem('selectedPrinter') || '');

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
                    
                    // Notifications
                    setNotificarRecebido(s.notificar_recebido ?? true);
                    setNotificarPreparo(s.notificar_preparo ?? true);
                    setNotificarPronto(s.notificar_pronto ?? true);
                    setNotificarEntrega(s.notificar_entrega ?? true);
                    setNotificarFinalizado(s.notificar_finalizado ?? true);
                    setNotificarCancelado(s.notificar_cancelado ?? true);
                    
                    setMsgRecebido(s.msg_recebido || 'Olá {cliente}! 👋 Recebemos seu pedido #{numero} em *{loja}*. Já estamos analisando!');
                    setMsgPreparo(s.msg_preparo || 'Olá {cliente}! 👨‍🍳 Seu pedido #{numero} começou a ser preparado em *{loja}*. Em breve avisaremos quando sair para entrega!');
                    setMsgPronto(s.msg_pronto || 'Olá {cliente}! ✅ Seu pedido #{numero} de *{loja}* está pronto!');
                    setMsgEntrega(s.msg_entrega || 'Olá {cliente}! 🛵 Seu pedido #{numero} de *{loja}* saiu para entrega! Fique atento(a).');
                    setMsgFinalizado(s.msg_finalizado || 'Pedido #{numero} de *{loja}* concluído. Obrigado pela preferência, {cliente}! ⭐');
                    setMsgCancelado(s.msg_cancelado || 'Olá {cliente}, seu pedido #{numero} em *{loja}* foi cancelado. Se tiver dúvidas, entre em contato conosco.');

                    // AI Bot
                    setBotAtivoWhatsapp(s.bot_ativo_whatsapp || false);
                    setBotPersonalidade(s.bot_personalidade || '');
                    setBotConhecimento(s.bot_conhecimento || '');
                    setBotAlertaTransbordo(s.bot_alerta_transbordo ?? true);

                    setLogoPreview(getImageUrl(s.logo));
                    setBannerPreview(getImageUrl(s.banner));

                    // Delivery
                    setTipoTaxaEntrega(s.tipo_taxa_entrega || 'FIXA');
                    setTaxaEntregaFixa(s.taxa_entrega_fixa ? parseFloat(s.taxa_entrega_fixa).toFixed(2) : '0.00');
                    setBairros(s.bairros_entrega || []);

                    // QR & Catalog
                    setModoCatalogo(s.modo_catalogo || false);
                    setPermitirPedidoMesa(s.permitir_pedido_mesa || false);
                    setModoCatalogoMesa(s.modo_catalogo_mesa || false);
                    if (s.quantidade_mesas > 0) setShowQRs(true);

                    // CRM
                    setCrmDiasAusente(s.crm_dias_ausente || 7);
                    setCrmMsgAusente(s.crm_msg_ausente || '');
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        if (isElectron) {
            (window as any).electron.getPrinters().then((list: any[]) => {
                setPrinters(list);
            });
        }
    }, [isElectron]);

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
            
            // Notifications - Use '1' and '0' for better multipart/form-data compatibility
            formData.append('notificar_recebido', notificarRecebido ? '1' : '0');
            formData.append('notificar_preparo', notificarPreparo ? '1' : '0');
            formData.append('notificar_pronto', notificarPronto ? '1' : '0');
            formData.append('notificar_entrega', notificarEntrega ? '1' : '0');
            formData.append('notificar_finalizado', notificarFinalizado ? '1' : '0');
            formData.append('notificar_cancelado', notificarCancelado ? '1' : '0');

            formData.append('msg_recebido', msgRecebido);
            formData.append('msg_preparo', msgPreparo);
            formData.append('msg_pronto', msgPronto);
            formData.append('msg_entrega', msgEntrega);
            formData.append('msg_finalizado', msgFinalizado);
            formData.append('msg_cancelado', msgCancelado);

            // AI Bot
            formData.append('bot_ativo_whatsapp', botAtivoWhatsapp ? '1' : '0');
            formData.append('bot_personalidade', botPersonalidade);
            formData.append('bot_conhecimento', botConhecimento);
            formData.append('bot_alerta_transbordo', botAlertaTransbordo ? '1' : '0');

            formData.append('tipo_taxa_entrega', tipoTaxaEntrega);
            formData.append('taxa_entrega_fixa', taxaEntregaFixa.replace(',', '.'));
            
            // QR & Catalog - Use '1' and '0'
            formData.append('modo_catalogo', modoCatalogo ? '1' : '0');
            formData.append('permitir_pedido_mesa', permitirPedidoMesa ? '1' : '0');
            formData.append('modo_catalogo_mesa', modoCatalogoMesa ? '1' : '0');
            formData.append('quantidade_mesas', String(quantidadeMesas));

            if (logoFile) formData.append('logo', logoFile);
            if (bannerFile) formData.append('banner', bannerFile);

            // CRM
            formData.append('crm_dias_ausente', String(crmDiasAusente));
            formData.append('crm_msg_ausente', crmMsgAusente);

            const token = localStorage.getItem('token');
            const res = await fetch(`/api/lojas/${storeSlug}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                const s = await res.json();
                setSaved(true);
                refreshBilling();
                
                // Update local state with fresh data from server
                setPermitirPedidoMesa(s.permitir_pedido_mesa ?? false);
                setModoCatalogoMesa(s.modo_catalogo_mesa ?? false);
                setQuantidadeMesas(s.quantidade_mesas ?? 0);
                
                setTimeout(() => setSaved(false), 3000);
            } else {
                const data = await res.json();
                let errMsg = 'Erro ao salvar. Verifique os dados.';
                if (data.quantidade_mesas) errMsg = data.quantidade_mesas[0];
                else if (typeof data === 'object') errMsg = Object.values(data).flat()[0] as string;
                setError(errMsg);
            }
        } catch (err: any) {
            setError('Erro de conexão ao servidor: ' + (err.message || 'Desconhecido'));
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
        
        const path = isMainApp ? `/s/${storeSlug}` : '';
        const mesaPath = mesa !== undefined ? `/m/${mesa}` : '';
        
        return `${baseUrl}${path}${mesaPath}`;
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

            <main className="max-w-7xl mx-auto p-8 space-y-8">
                {/* Link do Cardápio - Top Full Width */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 shadow-xl text-white space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Globe size={120} />
                    </div>

                    <div className="flex items-center gap-3 border-l-4 border-primary pl-4 relative z-10">
                        <Globe size={24} className="text-primary" />
                        <h2 className="text-xl font-bold uppercase italic">Link do Cardápio Digital</h2>
                    </div>

                        <div className="space-y-4 relative z-10">
                            <p className="text-gray-400 text-sm font-medium italic">Este é o endereço que seus clientes usarão para acessar seu cardápio.</p>

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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Coluna Esquerda */}
                        <div className="space-y-8">
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

                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Logo da Loja</label>
                                        <input type="file" id="store-logo" className="hidden" accept="image/*" onChange={handleLogoChange} />
                                        <div 
                                            onClick={() => document.getElementById('store-logo')?.click()} 
                                            className="border-2 border-dashed border-gray-200 rounded-2xl h-32 w-32 flex items-center justify-center cursor-pointer group relative overflow-hidden bg-gray-50 hover:bg-white hover:border-primary hover:shadow-lg transition-all"
                                        >
                                            {logoPreview ? (
                                                <>
                                                    <img src={logoPreview} className="w-full h-full object-contain p-2" alt="Logo" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <Upload size={24} className="text-white" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <Upload size={24} className="text-gray-300 group-hover:text-primary transition-colors" />
                                                    <span className="text-[10px] font-black text-gray-400 uppercase">Logo</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CRM Settings */}
                            {store?.plano_tipo !== 'START' && (
                                <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 space-y-6">
                                    <div className="flex items-center gap-3 border-l-4 border-blue-500 pl-4">
                                        <Sparkles className="text-blue-500" />
                                        <h2 className="text-xl font-bold text-gray-900 uppercase italic">CRM & Retenção</h2>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Dias para considerar cliente ausente</label>
                                            <div className="flex items-center gap-4">
                                                <input 
                                                    type="range" 
                                                    min="1" 
                                                    max="60" 
                                                    value={crmDiasAusente} 
                                                    onChange={(e) => setCrmDiasAusente(parseInt(e.target.value))} 
                                                    className="flex-1 accent-blue-500"
                                                />
                                                <span className="w-12 text-center font-black text-blue-600 bg-blue-50 py-1 rounded-lg border border-blue-100">
                                                    {crmDiasAusente}d
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Mensagem de "Saudade" (Automática)</label>
                                            <textarea 
                                                value={crmMsgAusente} 
                                                onChange={(e) => setCrmMsgAusente(e.target.value)} 
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium min-h-[100px]"
                                                placeholder="Ex: Olá {cliente}! Sentimos sua falta..."
                                            />
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Variáveis: {'{cliente}, {loja}'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AI Bot Settings */}
                            {store?.plano_tipo !== 'START' && (
                                <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 space-y-6">
                                    <div className="flex items-center justify-between border-l-4 border-purple-500 pl-4">
                                        <div className="flex items-center gap-3">
                                            <Bot className="text-purple-500" />
                                            <h2 className="text-xl font-bold text-gray-900 uppercase italic">Inteligência Artificial (IA)</h2>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={botAtivoWhatsapp} onChange={(e) => setBotAtivoWhatsapp(e.target.checked)} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                                        </label>
                                    </div>

                                    {botAtivoWhatsapp && (
                                        <div className="space-y-6 animate-slide-up">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Personalidade da IA</label>
                                                <textarea 
                                                    value={botPersonalidade} 
                                                    onChange={(e) => setBotPersonalidade(e.target.value)}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm font-medium min-h-[100px]"
                                                    placeholder="Ex: Você é um atendente simpático e ágil da Pizzaria..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Base de Conhecimento</label>
                                                <textarea 
                                                    value={botConhecimento} 
                                                    onChange={(e) => setBotConhecimento(e.target.value)}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm font-medium min-h-[120px]"
                                                    placeholder="Liste aqui regras, preços de entrega, observações do cardápio..."
                                                />
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
                                                <div className="flex items-center gap-3">
                                                    <Bell size={18} className="text-purple-600" />
                                                    <span className="text-xs font-bold text-purple-700 uppercase italic">Alerta de Atendimento Humano</span>
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    checked={botAlertaTransbordo} 
                                                    onChange={(e) => setBotAlertaTransbordo(e.target.checked)}
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Coluna Direita */}
                        <div className="space-y-8">
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
                    {store?.plano_tipo !== 'START' && (
                        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center justify-between border-l-4 border-indigo-500 pl-4">
                                <div className="flex items-center gap-3">
                                    <QrCode className="text-indigo-500" />
                                    <h2 className="text-xl font-bold text-gray-900 uppercase italic">Cardápio de Mesa & QR Codes</h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Modo de Operação (Local)</label>
                                    <div className="space-y-3">
                                        <button 
                                            onClick={() => { setPermitirPedidoMesa(true); setModoCatalogoMesa(false); }}
                                            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${permitirPedidoMesa && !modoCatalogoMesa ? 'border-indigo-500 bg-white shadow-lg' : 'border-gray-100 bg-white/50 opacity-60'}`}
                                        >
                                            <div className="text-left">
                                                <p className="font-black text-xs uppercase italic tracking-tight text-gray-900">Pedido por QR Code</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">Clientes pedem diretamente da mesa</p>
                                            </div>
                                            <CheckCircle2 size={20} className={permitirPedidoMesa && !modoCatalogoMesa ? 'text-indigo-500' : 'text-gray-200'} />
                                        </button>

                                        <button 
                                            onClick={() => { setPermitirPedidoMesa(false); setModoCatalogoMesa(true); }}
                                            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${modoCatalogoMesa ? 'border-orange-500 bg-white shadow-lg' : 'border-gray-100 bg-white/50 opacity-60'}`}
                                        >
                                            <div className="text-left">
                                                <p className="font-black text-xs uppercase italic tracking-tight text-gray-900">Apenas Visualização</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">Código serve apenas como cardápio digital</p>
                                            </div>
                                            <Eye size={20} className={modoCatalogoMesa ? 'text-orange-500' : 'text-gray-200'} />
                                        </button>

                                        <button 
                                            onClick={() => { setPermitirPedidoMesa(false); setModoCatalogoMesa(false); }}
                                            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${!permitirPedidoMesa && !modoCatalogoMesa ? 'border-gray-900 bg-white shadow-lg' : 'border-gray-100 bg-white/50 opacity-60'}`}
                                        >
                                            <div className="text-left">
                                                <p className="font-black text-xs uppercase italic tracking-tight text-gray-900">Desativar QR Codes</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">Usa apenas o link de Delivery/Entrega</p>
                                            </div>
                                            <X size={20} className={!permitirPedidoMesa && !modoCatalogoMesa ? 'text-gray-900' : 'text-gray-200'} />
                                        </button>
                                    </div>
                                </div>

                                {/* Configuração Dinâmica baseada no Modo */}
                                {modoCatalogoMesa && (
                                    <div className="space-y-4 animate-slide-up">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Acesso Rápido</label>
                                        <div className="bg-white p-6 rounded-xl border border-gray-100 flex flex-col items-center gap-4">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase text-center">No modo visualização, todas as mesas usam o mesmo código.</p>
                                            <button 
                                                onClick={() => { setShowQRs(true); }} 
                                                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                <QrCode size={16} />
                                                Gerar QR Code Cardápio Digital
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {permitirPedidoMesa && !modoCatalogoMesa && (
                                    <div className="space-y-4 animate-slide-up">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Configurar Mesas</label>
                                        <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-600 uppercase">Quantidade de Mesas</span>
                                                <input 
                                                    type="number" 
                                                    value={quantidadeMesas} 
                                                    min={1}
                                                    onChange={(e) => setQuantidadeMesas(Math.max(1, parseInt(e.target.value) || 0))} 
                                                    className="w-20 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-black" 
                                                />
                                            </div>
                                            <button 
                                                onClick={() => setShowQRs(true)} 
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                <QrCode size={16} />
                                                Gerar QR Code de cada Mesa
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {showQRs && (permitirPedidoMesa || modoCatalogoMesa) && (
                               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100 max-h-[400px] overflow-y-auto custom-scrollbar shadow-inner">
                                    {modoCatalogoMesa ? (
                                        <div className="bg-white p-6 rounded-2xl flex flex-col items-center gap-4 shadow-sm border border-orange-100 hover:border-orange-300 transition-all group col-span-full max-w-sm mx-auto">
                                            <div className="bg-orange-50 p-6 rounded-xl group-hover:bg-white transition-colors">
                                                <QRCode value={getCatalogUrl(0)} size={200} />
                                            </div>
                                            <div className="text-center">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Cardápio Digital Geral</span>
                                                <p className="text-sm font-black italic uppercase tracking-tighter text-gray-900">Apenas Visualização</p>
                                            </div>
                                            <div className="w-full space-y-2">
                                                <p className="text-[8px] text-gray-400 font-mono break-all text-center bg-gray-50 p-2 rounded-lg">{getCatalogUrl(0)}</p>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(getCatalogUrl(0));
                                                        alert('Link copiado!');
                                                    }}
                                                    className="w-full py-2 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
                                                >
                                                    Copiar Link
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        Array.from({ length: quantidadeMesas }, (_, i) => i + 1).map(mesa => (
                                            <div key={mesa} className="bg-white p-4 rounded-xl flex flex-col items-center gap-3 shadow-sm border border-gray-100 hover:border-indigo-200 transition-all group">
                                                <div className="bg-gray-50 p-3 rounded-lg group-hover:bg-white transition-colors">
                                                    <QRCode value={getCatalogUrl(mesa)} size={120} />
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-indigo-600 transition-colors italic">Mesa {mesa}</span>
                                                </div>
                                                <div className="w-full space-y-2">
                                                    <p className="text-[7px] text-gray-300 font-mono break-all text-center truncate">{getCatalogUrl(mesa)}</p>
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(getCatalogUrl(mesa));
                                                            alert(`Link da Mesa ${mesa} copiado!`);
                                                        }}
                                                        className="w-full py-1.5 bg-gray-100 text-gray-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                                                    >
                                                        Copiar
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                               </div>
                            )}
                        </div>
                    )}

                    {/* Taxa de Entrega e Bairros */}
                    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-orange-500 pl-4">
                            <Truck className="text-orange-500" />
                            <h2 className="text-xl font-bold text-gray-900 uppercase italic">Taxas de Entrega</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="flex p-1 bg-gray-100 rounded-xl">
                                <button 
                                    onClick={() => setTipoTaxaEntrega('FIXA')}
                                    className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tipoTaxaEntrega === 'FIXA' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Taxa Fixa
                                </button>
                                <button 
                                    onClick={() => setTipoTaxaEntrega('BAIRRO')}
                                    className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tipoTaxaEntrega === 'BAIRRO' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Por Bairro
                                </button>
                            </div>

                            {tipoTaxaEntrega === 'FIXA' ? (
                                <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100 space-y-3">
                                    <label className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Valor da Taxa Fixa</label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-black text-orange-300">R$</span>
                                        <input 
                                            type="text" 
                                            value={taxaEntregaFixa} 
                                            onChange={(e) => setTaxaEntregaFixa(e.target.value)}
                                            className="w-full bg-transparent border-b-2 border-orange-200 focus:border-orange-500 outline-none text-2xl font-black text-orange-600 py-1"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-[10px] text-orange-400 italic">Valor cobrado para qualquer entrega.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <div className="flex-[2] space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome do Bairro</label>
                                            <input 
                                                type="text" 
                                                placeholder="Ex: Centro" 
                                                value={novoBairroNome}
                                                onChange={(e) => setNovoBairroNome(e.target.value)}
                                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-500 font-bold text-sm"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Taxa R$</label>
                                            <input 
                                                type="text" 
                                                placeholder="0.00" 
                                                value={novoBairroTaxa}
                                                onChange={(e) => setNovoBairroTaxa(e.target.value)}
                                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-500 font-bold text-sm"
                                            />
                                        </div>
                                        <div className="flex items-end pb-0.5">
                                            <button 
                                                onClick={handleAddBairro}
                                                disabled={isAddingBairro || !novoBairroNome || !novoBairroTaxa}
                                                className="p-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {bairros.map(b => (
                                            <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                                                <div className="flex items-center gap-3">
                                                    <MapPin size={14} className="text-orange-400" />
                                                    <span className="text-xs font-black text-gray-700 uppercase italic truncate max-w-[120px]">{b.nome}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-black text-orange-600">R$ {parseFloat(b.taxa).toFixed(2)}</span>
                                                    <button onClick={() => handleRemoveBairro(b.id)} className="text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                        {bairros.length === 0 && (
                                            <div className="text-center py-8">
                                                <p className="text-[10px] font-black text-gray-300 uppercase italic">Nenhum bairro cadastrado</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                </div>

                {/* Notificações WhatsApp - Full Width Bottom */}
                {store?.plano_tipo !== 'START' && (
                    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 space-y-8">
                        <div className="flex items-center gap-3 border-l-4 border-green-500 pl-4">
                            <MessageSquare className="text-green-500" />
                            <div className="flex flex-col">
                                <h2 className="text-xl font-bold text-gray-900 uppercase italic leading-none">Notificações WhatsApp</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Personalize as mensagens automáticas</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* As mensagens agora ficam em grid interna para economizar espaço */}
                            
                            {/* Recebido */}
                            <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all hover:bg-white hover:shadow-md group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Bell size={18} className="text-blue-600" />
                                        <span className="text-xs font-black text-gray-700 uppercase italic">Recebido</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={notificarRecebido} onChange={(e) => setNotificarRecebido(e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                    </label>
                                </div>
                                {notificarRecebido && (
                                    <textarea value={msgRecebido} onChange={(e) => setMsgRecebido(e.target.value)} className="w-full h-24 p-3 bg-white border border-gray-100 rounded-lg text-[10px] font-medium text-gray-600 focus:ring-2 focus:ring-green-500/20 focus:outline-none resize-none" />
                                )}
                            </div>

                            {/* Em Preparo */}
                            <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all hover:bg-white hover:shadow-md group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Clock size={18} className="text-orange-600" />
                                        <span className="text-xs font-black text-gray-700 uppercase italic">Preparo</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={notificarPreparo} onChange={(e) => setNotificarPreparo(e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                    </label>
                                </div>
                                {notificarPreparo && (
                                    <textarea value={msgPreparo} onChange={(e) => setMsgPreparo(e.target.value)} className="w-full h-24 p-3 bg-white border border-gray-100 rounded-lg text-[10px] font-medium text-gray-600 focus:ring-2 focus:ring-green-500/20 focus:outline-none resize-none" />
                                )}
                            </div>

                            {/* Pronto */}
                            <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all hover:bg-white hover:shadow-md group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 size={18} className="text-indigo-600" />
                                        <span className="text-xs font-black text-gray-700 uppercase italic">Pronto</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={notificarPronto} onChange={(e) => setNotificarPronto(e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                    </label>
                                </div>
                                {notificarPronto && (
                                    <textarea value={msgPronto} onChange={(e) => setMsgPronto(e.target.value)} className="w-full h-24 p-3 bg-white border border-gray-100 rounded-lg text-[10px] font-medium text-gray-600 focus:ring-2 focus:ring-green-500/20 focus:outline-none resize-none" />
                                )}
                            </div>

                            {/* Entrega */}
                            <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all hover:bg-white hover:shadow-md group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Truck size={18} className="text-blue-600" />
                                        <span className="text-xs font-black text-gray-700 uppercase italic">Entrega</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={notificarEntrega} onChange={(e) => setNotificarEntrega(e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                    </label>
                                </div>
                                {notificarEntrega && (
                                    <textarea value={msgEntrega} onChange={(e) => setMsgEntrega(e.target.value)} className="w-full h-24 p-3 bg-white border border-gray-100 rounded-lg text-[10px] font-medium text-gray-600 focus:ring-2 focus:ring-green-500/20 focus:outline-none resize-none" />
                                )}
                            </div>

                            {/* Finalizado */}
                            <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all hover:bg-white hover:shadow-md group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 size={18} className="text-green-600" />
                                        <span className="text-xs font-black text-gray-700 uppercase italic">Finalizado</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={notificarFinalizado} onChange={(e) => setNotificarFinalizado(e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                    </label>
                                </div>
                                {notificarFinalizado && (
                                    <textarea value={msgFinalizado} onChange={(e) => setMsgFinalizado(e.target.value)} className="w-full h-24 p-3 bg-white border border-gray-100 rounded-lg text-[10px] font-medium text-gray-600 focus:ring-2 focus:ring-green-500/20 focus:outline-none resize-none" />
                                )}
                            </div>

                            {/* Cancelado */}
                            <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all hover:bg-white hover:shadow-md group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Trash2 size={18} className="text-red-600" />
                                        <span className="text-xs font-black text-gray-700 uppercase italic">Cancelado</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={notificarCancelado} onChange={(e) => setNotificarCancelado(e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                    </label>
                                </div>
                                {notificarCancelado && (
                                    <textarea value={msgCancelado} onChange={(e) => setMsgCancelado(e.target.value)} className="w-full h-24 p-3 bg-white border border-gray-100 rounded-lg text-[10px] font-medium text-gray-600 focus:ring-2 focus:ring-green-500/20 focus:outline-none resize-none" />
                                )}
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-xl flex gap-4">
                            <Sparkles className="text-blue-500 shrink-0" size={20} />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest italic">Dica Pro</p>
                                <p className="text-[10px] font-bold text-blue-600 uppercase italic leading-tight">Use as variáveis: {'{cliente}'}, {'{numero}'} e {'{loja}'} para personalizar automaticamente.</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
