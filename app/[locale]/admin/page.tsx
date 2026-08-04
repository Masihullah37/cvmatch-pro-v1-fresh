'use client';

import { useState, useEffect } from 'react';
import { toast, Toaster } from 'sonner';
import {
  Users,
  CreditCard,
  BarChart3,
  ShieldAlert,
  Gift,
  Trash2,
  Calendar,
  Search,
  ArrowUpRight,
  TrendingUp,
  UserPlus,
  Lock,
  Unlock,
  Clock,
  Sparkles
} from 'lucide-react';
import OuiCVLoader from '@/components/common/OuiCVLoader';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAllUsers,
  updateUserCredits,
  toggleUserBlock,
  deleteUser,
  getAdminStats,
  getSiteSettings,
  updateSiteSettings,
  getAllPayments
} from '@/lib/actions/admin';
import { RefreshCcw, CheckCircle2, XCircle } from 'lucide-react';
// Use native Intl for date formatting to avoid extra dependencies
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [settings, setSettings] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [allUsers, allStats, allSettings, allPayments] = await Promise.all([
        getAllUsers(),
        getAdminStats(),
        getSiteSettings(),
        getAllPayments()
      ]);
      setUsers(allUsers);
      setStats(allStats);
      setSettings(allSettings);
      setPayments(allPayments);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'warning' = 'warning') => {
    setConfirmConfig({ title, message, onConfirm, variant });
    setIsConfirmModalOpen(true);
  };

  const handleToggleBlock = (userId: string, currentStatus: boolean) => {
    triggerConfirm(
      currentStatus ? 'Débloquer' : 'Bloquer',
      `Voulez-vous ${currentStatus ? 'débloquer' : 'bloquer'} cet utilisateur ?`,
      async () => {
        await toggleUserBlock(userId, !currentStatus);
        loadData();
      }
    );
  };

  const handleDeleteUser = (userId: string) => {
    triggerConfirm(
      'Supprimer',
      'Action irréversible : Supprimer cet utilisateur ?',
      async () => {
        await deleteUser(userId);
        loadData();
      },
      'danger'
    );
  };

  const handleRefund = async (stripePaymentIntentId: string) => {
    if (refundingId) return;

    triggerConfirm(
      'Remboursement',
      'Voulez-vous vraiment rembourser cette transaction ? L\'accès Pro de l\'utilisateur sera réinitialisé.',
      async () => {
        try {
          setRefundingId(stripePaymentIntentId);
          const res = await fetch('/api/admin/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stripePaymentIntentId })
          });

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText);
          }

          toast.success("Remboursement effectué avec succès !");
          await loadData();
        } catch (err: any) {
          console.error(err);
          toast.error("Erreur: " + err.message);
        } finally {
          setRefundingId(null);
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <OuiCVLoader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Accès Refusé</h2>
          <p className="text-slate-500 font-medium leading-relaxed">{error}</p>
          <button
            onClick={() => loadData()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Admin <span className="text-emerald-600">Dashboard</span></h1>
            <p className="text-slate-500 font-medium mt-2 text-lg">Gérez vos utilisateurs et suivez les performances de OuiCV Pro.</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 w-full md:w-auto">
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200" />)}
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">En ligne</p>
              <p className="text-sm font-bold text-slate-900">{stats?.totalUsers || 0} Utilisateurs</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<TrendingUp className="text-emerald-600" />} label="Analyses ATS" value={stats?.totalScans || 0} subValue="Volume total" />
          <StatCard icon={<ArrowUpRight className="text-emerald-600" />} label="CV Générés" value={stats?.totalGens || 0} subValue="Exports PDF" />
          <StatCard icon={<Users className="text-emerald-600" />} label="Inscrits" value={stats?.totalUsers || 0} subValue="Membres actifs" />
          <StatCard icon={<CreditCard className="text-emerald-600" />} label="Plans" value="Pro / Starter" subValue="Modèle économique" />
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="flex flex-wrap border-b border-slate-100 p-2 gap-2">
            <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={18} />} label="Utilisateurs" />
            <TabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<CreditCard size={18} />} label="Transactions" />
            <TabButton active={activeTab === 'marketing'} onClick={() => setActiveTab('marketing')} icon={<Gift size={18} />} label="Marketing & Offres" />
          </div>

          <div className="p-4 md:p-8">
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 ring-emerald-500/20 transition-all font-medium"
                      placeholder="Rechercher par nom ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => setIsUserModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                  >
                    <UserPlus size={18} /> Ajouter Utilisateur
                  </button>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-slate-100">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Utilisateur</th>
                        <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Plan / Crédits</th>
                        <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Expiration</th>
                        <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors ${user.isBlocked ? 'opacity-50' : ''}`}>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center text-emerald-600 font-black text-lg">
                                {user.name?.[0] || user.email?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{user.name || 'Anonyme'}</p>
                                <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                              </div>
                              {user.isAdmin && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-black ml-2">ADMIN</span>}
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${user.plan === 'monthly' ? 'bg-purple-100 text-purple-700' :
                                  user.plan === 'one_time' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-500'
                                }`}>
                                {user.plan}
                              </span>
                              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-black text-[11px]">
                                <CreditCard size={12} /> {user.credits}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-sm text-slate-500 font-bold">
                            {user.creditsExpiry ? (
                              <div className="flex items-center gap-2">
                                <Clock size={14} />
                                {formatDate(new Date(user.creditsExpiry))}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center justify-end gap-2">
                              <ActionButton
                                onClick={() => { setTargetUser(user); setIsCreditModalOpen(true); }}
                                icon={<Gift size={16} />}
                                tooltip="Offrir crédits"
                                className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                              />
                              <ActionButton
                                onClick={() => handleToggleBlock(user.id, user.isBlocked)}
                                icon={user.isBlocked ? <Unlock size={16} /> : <Lock size={16} />}
                                tooltip={user.isBlocked ? "Débloquer" : "Bloquer"}
                                className={user.isBlocked ? "text-amber-600 bg-amber-50 hover:bg-amber-100" : "text-slate-400 bg-slate-50 hover:bg-slate-100"}
                              />
                              <ActionButton
                                onClick={() => handleDeleteUser(user.id)}
                                icon={<Trash2 size={16} />}
                                tooltip="Supprimer"
                                className="text-red-500 bg-red-50 hover:bg-red-100"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="overflow-x-auto rounded-3xl border border-slate-100">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Transaction</th>
                        <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Client</th>
                        <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Montant</th>
                        <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Statut</th>
                        <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-900 capitalize">{payment.paymentType || 'Achat'}</span>
                              <span className="text-[10px] text-slate-400 font-medium font-mono">{payment.stripePaymentIntentId}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{formatDate(new Date(payment.createdAt))}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{payment.userName || payment.userEmail || payment.guestEmail || 'Client inconnu'}</span>
                              <span className="text-xs text-slate-500 font-medium">{payment.userEmail || payment.guestEmail}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 font-black text-slate-900 uppercase">
                            {(payment.amount / 100).toFixed(2)} {payment.currency}
                          </td>
                          <td className="px-6 py-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${payment.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                payment.status === 'refunded' ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-500'
                              }`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex justify-end">
                              {payment.status === 'completed' && payment.stripePaymentIntentId && (
                                <button
                                  onClick={() => handleRefund(payment.stripePaymentIntentId)}
                                  disabled={!!refundingId}
                                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                >
                                  {refundingId === payment.stripePaymentIntentId ? (
                                    <RefreshCcw size={12} className="animate-spin" />
                                  ) : (
                                    <RefreshCcw size={12} />
                                  )}
                                  Issue Refund
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold italic">
                            Aucune transaction trouvée.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'marketing' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center">
                        <Gift size={28} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900">Promotion Actuelle</h3>
                        <p className="text-slate-500 font-medium">Gérez l'offre flash pour les utilisateurs</p>
                      </div>
                    </div>

                    <form className="space-y-6" onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as any;
                      const offer = {
                        discount: parseInt(form.discount.value),
                        description: form.description.value,
                        expiresAt: form.expires.value || null,
                        isActive: form.isActive.checked
                      };
                      await updateSiteSettings(offer);
                      loadData();
                      toast.success("Offre mise à jour !");
                    }}>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="font-bold text-slate-700">Activer l'offre</span>
                          <input name="isActive" type="checkbox" defaultChecked={settings?.activeOffer?.isActive} className="w-6 h-6 accent-emerald-600 cursor-pointer" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Remise (%)</label>
                          <input name="discount" type="number" defaultValue={settings?.activeOffer?.discount || 20} className="w-full bg-slate-50 rounded-2xl px-6 py-4 outline-none focus:ring-2 ring-emerald-500/20 font-bold" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Description motivante</label>
                          <textarea name="description" defaultValue={settings?.activeOffer?.description || "Boostez votre carrière dès aujourd'hui !"} className="w-full bg-slate-50 rounded-2xl px-6 py-4 outline-none focus:ring-2 ring-emerald-500/20 font-bold h-32" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Date d'expiration (optionnel)</label>
                          <input name="expires" type="date" defaultValue={settings?.activeOffer?.expiresAt || ""} className="w-full bg-slate-50 rounded-2xl px-6 py-4 outline-none focus:ring-2 ring-emerald-500/20 font-bold" />
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all active:scale-95">Mettre à jour l'offre</button>
                    </form>
                  </div>

                  <div className="space-y-8">
                    <StatCard
                      icon={<TrendingUp className="text-emerald-500" size={24} />}
                      label="Conversion"
                      value="12.4%"
                      subValue="+2.1% ce mois-ci"
                    />
                    <div className="bg-emerald-600 p-10 rounded-[2.5rem] text-white space-y-4">
                      <Sparkles size={32} className="opacity-50" />
                      <h4 className="text-2xl font-bold">Conseil Marketing</h4>
                      <p className="text-emerald-100 font-medium">Une remise de 30% pendant 48h génère statistiquement 3x plus de conversions qu'une remise permanente de 10%.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirmModalOpen && confirmConfig && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsConfirmModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 space-y-8"
            >
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${confirmConfig.variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>
                {confirmConfig.variant === 'danger' ? <Trash2 size={32} /> : <ShieldAlert size={32} />}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">{confirmConfig.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed mt-2">{confirmConfig.message}</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-black transition-all active:scale-95"
                >
                  Annuler
                </button>
                <button
                  onClick={() => { confirmConfig.onConfirm(); setIsConfirmModalOpen(false); }}
                  className={`flex-1 py-4 rounded-2xl font-black text-white transition-all shadow-lg active:scale-95 ${confirmConfig.variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'}`}
                >
                  Confirmer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Credit Modal */}
      <AnimatePresence>
        {isCreditModalOpen && targetUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsCreditModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 space-y-8"
            >
              <div className="flex justify-between items-start">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center">
                  <Gift size={32} />
                </div>
                <button onClick={() => setIsCreditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Search size={24} className="rotate-45" /></button>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Offrir des crédits</h3>
                <p className="text-slate-500 font-medium">À {targetUser.email}</p>
              </div>
              <form className="space-y-6" onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                await updateUserCredits(targetUser.id, parseInt(form.amount.value), parseInt(form.days.value));
                setIsCreditModalOpen(false);
                loadData();
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nombre de crédits</label>
                    <input name="amount" type="number" defaultValue="5" className="w-full bg-slate-50 rounded-2xl px-6 py-4 outline-none focus:ring-2 ring-emerald-500/20 font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Validité (jours)</label>
                    <input name="days" type="number" defaultValue="45" className="w-full bg-slate-50 rounded-2xl px-6 py-4 outline-none focus:ring-2 ring-emerald-500/20 font-bold" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-600/20 transition-all active:scale-95">Confirmer l'envoi</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Modal (Placeholder for creating users) */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsUserModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 space-y-8"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center">
                <UserPlus size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Ajouter un utilisateur</h3>
                <p className="text-slate-500 font-medium leading-relaxed">Invitez un nouvel utilisateur ou créez un compte manuellement via Clerk.</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-sm font-bold text-slate-600 text-center italic">"L'ajout direct sera bientôt intégré. Pour le moment, utilisez le tableau de bord Clerk pour inviter des utilisateurs."</p>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black transition-all">Fermer</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value, subValue }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-900 tracking-tight mb-2">{value}</p>
      <p className="text-xs font-bold text-slate-400">{subValue}</p>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-black transition-all ${active
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
          : 'text-slate-400 hover:bg-slate-50'
        }`}
    >
      {icon} {label}
    </button>
  );
}

function ActionButton({ onClick, icon, tooltip, className }: any) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`p-3 rounded-xl transition-all hover:scale-110 active:scale-95 ${className.replace('hover:bg-emerald-100', 'hover:bg-emerald-700 active:bg-emerald-800 hover:text-white')}`}
    >
      {icon}
    </button>
  );
}
