import React, { useState, useEffect } from 'react';
import {
    UserPlus,
    Trash2,
    Shield,
    ChefHat,
    Truck,
    UserCircle,
    X,
    CheckCircle2,
    AlertCircle,
    Banknote
} from 'lucide-react';
import { useBilling } from '@/context/BillingContext';

interface TeamMember {
    id: number;
    user: number;
    user_details: {
        id: number;
        username: string;
        email: string;
    };
    loja: number;
    role: 'owner' | 'manager' | 'waiter' | 'kitchen' | 'driver' | 'cashier';
    role_display: string;
    criado_em: string;
}

const ROLE_OPTIONS = [
    { value: 'manager', label: 'Gerente', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-100' },
    { value: 'waiter', label: 'Atendente', icon: UserCircle, color: 'text-blue-500', bg: 'bg-blue-100' },
    { value: 'cashier', label: 'Op. de Caixa', icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-100' },
    { value: 'kitchen', label: 'Cozinha', icon: ChefHat, color: 'text-orange-500', bg: 'bg-orange-100' },
    { value: 'driver', label: 'Entregador', icon: Truck, color: 'text-green-500', bg: 'bg-green-100' },
];

export default function TeamPage() {
    const { store } = useBilling();
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [storeId, setStoreId] = useState<number | null>(null);

    // New Member Form
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberPassword, setNewMemberPassword] = useState('');
    const [newMemberConfirmPassword, setNewMemberConfirmPassword] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('waiter');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const membersCount = team.filter(m => m.role !== 'owner').length;
    const isPlanStart = store?.plano_tipo === 'START';
    const isPlanPro = store?.plano_tipo === 'PRO';
    
    // START: 0 funcionários extras
    // PRO: 10 funcionários extras (não conta o proprietário)
    // ELITE: Sem limite explícito
    const canAddMore = !isPlanStart && !(isPlanPro && membersCount >= 10);

    const fetchTeam = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/equipe/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setTeam(Array.isArray(data) ? data : (data.results || []));

            if (!storeId) {
                const storeRes = await fetch('/api/lojas/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const storeData = await storeRes.json();
                const s = Array.isArray(storeData) ? storeData[0] : (storeData.results ? storeData.results[0] : storeData);
                if (s) setStoreId(s.id);
            }
        } catch (err) {
            console.error('Error fetching team:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeam();
    }, []);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId || !canAddMore) return;
        if (newMemberPassword !== newMemberConfirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/equipe/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    full_name: newMemberName,
                    email: newMemberEmail,
                    password: newMemberPassword,
                    loja: storeId,
                    role: newMemberRole
                })
            });
            if (response.ok) {
                setSuccess(true);
                setNewMemberName('');
                setNewMemberEmail('');
                setNewMemberPassword('');
                setNewMemberConfirmPassword('');
                setIsAddingMode(false);
                fetchTeam();
                setTimeout(() => setSuccess(false), 3000);
            } else {
                const data = await response.json();
                setError(data.error || 'Erro ao adicionar membro.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveMember = async (id: number) => {
        if (!confirm('Deseja realmente remover este membro?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/equipe/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setTeam(team.filter(m => m.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                    <h1 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter">Equipe e Permissões</h1>
                    <p className="text-gray-500 mt-1">Gerencie quem tem acesso à sua loja e quais seus papéis.</p>
                </div>
                <button
                    onClick={() => setIsAddingMode(true)}
                    disabled={!canAddMore}
                    className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 ${canAddMore ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                >
                    <UserPlus size={20} />
                    <span>Novo Membro</span>
                </button>
            </header>

            {success && <div className="bg-green-50 border border-green-100 text-green-600 px-6 py-4 rounded-xl flex items-center gap-3"><CheckCircle2 size={24} /> <span className="font-bold">Sucesso!</span></div>}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                        {team.map((member) => {
                            const roleInfo = ROLE_OPTIONS.find(r => r.value === member.role) || { icon: UserCircle, color: 'text-gray-500', bg: 'bg-gray-100', label: member.role_display };
                            const RoleIcon = roleInfo.icon;
                            return (
                                <div key={member.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-400 uppercase italic">{member.user_details.username.charAt(0)}</div>
                                        <div>
                                            <p className="font-black text-gray-900 uppercase italic tracking-tight">{member.user_details.username}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className={`${roleInfo.bg} ${roleInfo.color} p-1 rounded-md`}><RoleIcon size={12} /></div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{roleInfo.label}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveMember(member.id)} className="p-3 text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="lg:col-span-4">
                    <div className="bg-gray-900 rounded-xl p-8 text-white">
                        <h3 className="text-xl font-black italic uppercase mb-6 flex items-center gap-2"><Shield size={24} className="text-primary" /> Papéis</h3>
                        <div className="space-y-6">
                            {ROLE_OPTIONS.map(role => (
                                <div key={role.value} className="space-y-1">
                                    <div className="flex items-center gap-2"><role.icon size={16} className="text-primary" /><span className="font-black uppercase italic tracking-widest text-sm">{role.label}</span></div>
                                    <p className="text-xs text-gray-400 leading-relaxed pl-6">
                                        {role.value === 'manager' && 'Acesso total.'}
                                        {role.value === 'waiter' && 'Gestão de pedidos.'}
                                        {role.value === 'cashier' && 'Operador de caixa.'}
                                        {role.value === 'kitchen' && 'Visualiza produção.'}
                                        {role.value === 'driver' && 'Visualiza entregas.'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {isAddingMode && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-black italic uppercase">Novo Membro</h3>
                            <button onClick={() => setIsAddingMode(false)}><X size={24} /></button>
                        </div>
                        {error && <div className="bg-red-50 text-red-500 p-4 rounded-xl flex items-center gap-2 font-bold"><AlertCircle size={18} /><span>{error}</span></div>}
                        <input type="text" placeholder="Nome Completo" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl" />
                        <input type="email" placeholder="E-mail" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl" />
                        <div className="flex gap-4"><input type="password" placeholder="Senha" value={newMemberPassword} onChange={e => setNewMemberPassword(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl" /><input type="password" placeholder="Confirmar" value={newMemberConfirmPassword} onChange={e => setNewMemberConfirmPassword(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl" /></div>
                        <div className="grid grid-cols-2 gap-2">
                            {ROLE_OPTIONS.map(role => (
                                <button key={role.value} onClick={() => setNewMemberRole(role.value)} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 ${newMemberRole === role.value ? 'border-primary bg-primary/5' : 'bg-gray-50' }`}><span className="text-[10px] font-black uppercase text-gray-500">{role.label}</span></button>
                            ))}
                        </div>
                        <button onClick={handleAddMember} disabled={isSubmitting} className="w-full py-4 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest">{isSubmitting ? 'Salvando...' : 'Confirmar'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
