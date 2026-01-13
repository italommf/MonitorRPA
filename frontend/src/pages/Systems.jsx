import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Server, Copy, Check, Clock, Trash2, Edit2 } from 'lucide-react';
import { systemsApi } from '../services/api';
import { useHeader } from '../context/HeaderContext';
import SystemForm from '../components/SystemForm';
import ConfirmModal from '../components/ConfirmModal';
import { copyToClipboard, formatRelativeTime } from '../utils/helpers';

export default function Systems() {
    const navigate = useNavigate();
    const [systems, setSystems] = useState([]);
    // ... rest of state ...
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingSystem, setEditingSystem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [systemToDelete, setSystemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchSystems = useCallback(async (silent = false) => {
        // ... (same implementation) ...
        try {
            if (!silent) setIsLoading(true);
            setError(null);
            const { data } = await systemsApi.list();
            setSystems(data.items);
        } catch (err) {
            console.error('Error fetching systems:', err);
            setError('Erro ao carregar sistemas.');
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, []);

    const { updateHeader } = useHeader();

    useEffect(() => {
        updateHeader({
            onRefresh: fetchSystems,
            isRefreshing: isLoading,
            actions: (
                <button
                    onClick={() => setShowForm(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Novo Sistema
                </button>
            )
        });
    }, [fetchSystems, isLoading, updateHeader]);

    useEffect(() => {
        fetchSystems();
        const interval = setInterval(() => fetchSystems(true), 10000);
        return () => clearInterval(interval);
    }, [fetchSystems]);

    const handleCreate = async (data) => {
        try {
            setIsSubmitting(true);
            await systemsApi.create(data);
            setShowForm(false);
            fetchSystems();
        } catch (err) {
            console.error('Error creating system:', err);
            alert('Erro ao criar sistema');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (data) => {
        try {
            setIsSubmitting(true);
            await systemsApi.update(editingSystem.id, data);
            setEditingSystem(null);
            fetchSystems();
        } catch (err) {
            console.error('Error updating system:', err);
            alert('Erro ao atualizar sistema');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (e, system) => {
        e.stopPropagation();
        setSystemToDelete(system);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!systemToDelete) return;
        try {
            setIsDeleting(true);
            await systemsApi.delete(systemToDelete.id);
            setDeleteModalOpen(false);
            setSystemToDelete(null);
            fetchSystems();
        } catch (err) {
            console.error('Error deleting system:', err);
            alert('Erro ao excluir sistema');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCopyWebhook = async (e, system) => {
        e.stopPropagation();
        const webhookUrl = `${window.location.origin}/system/${system.webhook_token}`;
        const success = await copyToClipboard(webhookUrl);
        if (success) {
            setCopiedId(system.id);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    return (
        <div className="app-content">
            <div className="content-wrapper">
                <div className="content-panel">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white mb-2">Monitoramento de Sistemas</h2>
                        <p className="text-gray-400 text-sm">
                            Sistemas enviam pings periódicos para indicar que estão ativos.
                            Se não receberem ping dentro do intervalo configurado, são marcados como parados.
                        </p>
                    </div>

                    {error && (
                        <div className="glass-card border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6">
                            {error}
                        </div>
                    )}

                    {isLoading && systems.length === 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="glass-card rounded-2xl h-48 animate-pulse" />
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {systems.map((system) => (
                            <div
                                key={system.id}
                                onClick={() => navigate(`/systems/${system.id}`)}
                                className="glass-card rounded-2xl p-5 cursor-pointer animate-fadeIn hover:border-white/20 transition-all"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${system.is_active ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                            <Server className={`w-5 h-5 ${system.is_active ? 'text-green-400' : 'text-red-400'}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">{system.name}</h3>
                                            {system.description && (
                                                <p className="text-sm text-gray-400 line-clamp-1">{system.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${system.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {system.is_active ? 'Online' : 'Parado'}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span>Última: {formatRelativeTime(system.last_ping)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Server className="w-4 h-4" />
                                        <span>Intervalo: {system.timeout_interval} min</span>
                                    </div>
                                </div>

                                {/* Webhook URL box */}
                                <div className="bg-black/30 rounded-xl p-3 mb-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <code className="text-xs text-gray-400 truncate flex-1">
                                            {window.location.origin}/system/{system.webhook_token}
                                        </code>
                                        <button
                                            onClick={(e) => handleCopyWebhook(e, system)}
                                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                                            title="Copiar URL"
                                        >
                                            {copiedId === system.id ? (
                                                <Check className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <Copy className="w-4 h-4 text-gray-500" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`/systems/${system.id}`); }}
                                        className="btn-ghost text-sm"
                                    >
                                        Ver mais
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingSystem(system); }}
                                        className="btn-ghost text-sm"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, system)}
                                        className="btn-ghost text-sm text-red-400 hover:text-red-300"
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {!isLoading && systems.length === 0 && (
                        <div className="text-center py-16">
                            <div className="inline-flex p-4 rounded-2xl glass mb-4">
                                <Server className="w-12 h-12 text-gray-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-300 mb-2">
                                Nenhum sistema cadastrado
                            </h2>
                            <p className="text-gray-500 mb-6">
                                Configure um sistema para começar a monitorar os batimentos
                            </p>
                            <button
                                onClick={() => setShowForm(true)}
                                className="btn-primary inline-flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Criar Sistema
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {(showForm || editingSystem) && (
                <SystemForm
                    initialData={editingSystem}
                    onSubmit={editingSystem ? handleUpdate : handleCreate}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingSystem(null);
                    }}
                    isLoading={isSubmitting}
                />
            )}

            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setSystemToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title={`Excluir "${systemToDelete?.name}"?`}
                message="Esta ação é irreversível. Deseja realmente excluir este sistema?"
                confirmText="Excluir Sistema"
                isLoading={isDeleting}
            />
        </div>
    );
}
