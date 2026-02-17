'use client';

import React, { useState, useEffect } from 'react';
import {
    Users,
    UserPlus,
    Trash2,
    Shield,
    ChefHat,
    Truck,
    UserCircle,
    ChevronDown,
    Search,
    X,
    CheckCircle2,
    AlertCircle,
    Banknote
} from 'lucide-react';

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
        if (!storeId) return;

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
        } catch (err) {
            setError('Erro de conexão com o servidor.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveMember = async (id: number) => {
        if (!confirm('Tem certeza que deseja remover este membro da equipe?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/equipe/${id}//`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setTeam(team.filter(m => m.id !== id));
            }
        } catch (err) {
            console.error('Error removing member:', err);
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
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter">Equipe e Permissões</h1>
                    <p className="text-gray-500 mt-1">Gerencie quem tem acesso à sua loja e quais seus papéis.</p>
                </div>
                <button
                    onClick={() => setIsAddingMode(true)}
                    className="bg-primary text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    <UserPlus size={20} />
                    <span>Novo Membro</span>
                </button>
            </header>

            {success && (
                <div className="bg-green-50 border border-green-100 text-green-600 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <CheckCircle2 size={24} />
                    <span className="font-bold">Membro adicionado com sucesso!</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Team List */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <Users className="text-gray-400" />
                            <h2 className="font-black text-gray-900 uppercase italic tracking-tight">Equipe Atual</h2>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {team.length === 0 ? (
                                <div className="p-12 text-center space-y-4">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                                        <Users size={32} />
                                    </div>
                                    <p className="text-gray-400 font-medium italic">Nenhum membro da equipe adicionado ainda.</p>
                                </div>
                            ) : (
                                team.map((member) => {
                                    const roleInfo = ROLE_OPTIONS.find(r => r.value === member.role) || {
                                        icon: UserCircle, color: 'text-gray-500', bg: 'bg-gray-100', label: member.role_display
                                    };
                                    const RoleIcon = roleInfo.icon;

                                    return (
                                        <div key={member.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-tr from-gray-100 to-gray-200 rounded-full flex items-center justify-center font-black text-gray-400 uppercase italic">
                                                    {member.user_details.username.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 uppercase italic tracking-tight">{member.user_details.username}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className={`${roleInfo.bg} ${roleInfo.color} p-1 rounded-md`}>
                                                            <RoleIcon size={12} />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{roleInfo.label}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar / Roles Info */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-xl shadow-gray-200">
                        <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-2">
                            <Shield className="text-primary" /> Papéis e Funções
                        </h3>
                        <div className="space-y-6">
                            {ROLE_OPTIONS.map((role) => (
                                <div key={role.value} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`${role.bg} ${role.color} p-1.5 rounded-lg`}>
                                            <role.icon size={16} />
                                        </div>
                                        <span className="font-black uppercase italic tracking-widest text-sm">{role.label}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed pl-8">
                                        {role.value === 'manager' && 'Acesso total a produtos, pedidos e configurações da loja.'}
                                        {role.value === 'waiter' && 'Pode visualizar e gerenciar pedidos, mas não altera o menu.'}
                                        {role.value === 'cashier' && 'Acesso exclusivo ao PDV para abertura, venda e fechamento de caixa.'}
                                        {role.value === 'kitchen' && 'Foco na fila de produção. Visualiza pedidos aguardando preparo.'}
                                        {role.value === 'driver' && 'Visualiza apenas pedidos prontos para entrega e endereços.'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Member Modal */}
            {isAddingMode && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900">Adicionar Membro</h3>
                                <p className="text-sm text-gray-500 font-medium">Insira o nome de usuário do sistema</p>
                            </div>
                            <button onClick={() => setIsAddingMode(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddMember} className="p-8 space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-100 text-red-500 p-4 rounded-2xl flex items-center gap-2 text-sm font-bold animate-shake">
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Completo</label>
                                <input
                                    type="text"
                                    value={newMemberName}
                                    onChange={(e) => setNewMemberName(e.target.value)}
                                    placeholder="Ex: João da Silva"
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-primary/50 transition-all font-bold text-gray-900 placeholder:text-gray-300 shadow-sm"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">E-mail (Será o Login)</label>
                                <input
                                    type="email"
                                    value={newMemberEmail}
                                    onChange={(e) => setNewMemberEmail(e.target.value)}
                                    placeholder="Ex: joao@email.com"
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-primary/50 transition-all font-bold text-gray-900 placeholder:text-gray-300 shadow-sm"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Senha</label>
                                    <input
                                        type="password"
                                        value={newMemberPassword}
                                        onChange={(e) => setNewMemberPassword(e.target.value)}
                                        placeholder="••••••"
                                        className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-primary/50 transition-all font-bold text-gray-900 placeholder:text-gray-300 shadow-sm"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Confirme</label>
                                    <input
                                        type="password"
                                        value={newMemberConfirmPassword}
                                        onChange={(e) => setNewMemberConfirmPassword(e.target.value)}
                                        placeholder="••••••"
                                        className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-primary/50 transition-all font-bold text-gray-900 placeholder:text-gray-300 shadow-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Papel na Equipe</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {ROLE_OPTIONS.map((role) => (
                                        <button
                                            key={role.value}
                                            type="button"
                                            onClick={() => setNewMemberRole(role.value)}
                                            className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${newMemberRole === role.value
                                                ? 'border-primary bg-primary/5 shadow-inner'
                                                : 'border-gray-50 bg-gray-50 hover:border-gray-200'
                                                }`}
                                        >
                                            <div className={`${role.bg} ${role.color} p-1.5 rounded-xl`}>
                                                <role.icon size={16} />
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${newMemberRole === role.value ? 'text-primary' : 'text-gray-500'}`}>
                                                {role.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 mt-2 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-gray-100 hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Gerando Acesso...' : 'Confirmar e Criar Acesso'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
