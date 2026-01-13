import { useState, useEffect, useCallback } from 'react';
import { Plus, Bot } from 'lucide-react';
import { scriptsApi } from '../services/api';
import { useHeader } from '../context/HeaderContext';
import ScriptCard from '../components/ScriptCard';
import FilterBar from '../components/FilterBar';
import ScriptForm from '../components/ScriptForm';
import ConfirmModal from '../components/ConfirmModal';

export default function Scripts() {
    const [scripts, setScripts] = useState([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingScript, setEditingScript] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [scriptToDelete, setScriptToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchScripts = useCallback(async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            setError(null);
            const params = {};
            if (search) params.search = search;
            if (filter) params.filter_type = filter;

            const { data } = await scriptsApi.list(params);
            setScripts(data.items);
        } catch (err) {
            console.error('Error fetching scripts:', err);
            setError('Erro ao carregar scripts. Verifique se o backend está rodando.');
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [search, filter]);

    const { updateHeader } = useHeader();

    useEffect(() => {
        updateHeader({
            onRefresh: fetchScripts,
            isRefreshing: isLoading,
            actions: (
                <button
                    onClick={() => setShowForm(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Novo Script
                </button>
            )
        });
    }, [fetchScripts, isLoading, updateHeader]);

    useEffect(() => {
        fetchScripts();
    }, [fetchScripts]);

    // Real-time updates via SSE
    useEffect(() => {
        const eventSource = new EventSource('/api/events');

        eventSource.onmessage = (event) => {
            try {
                if (event.data.trim() === ': heartbeat') return;

                const data = JSON.parse(event.data);
                if (data.type === 'webhook_received') {
                    console.log('[Real-time] Webhook received for script_id:', data.data.script_id);
                    fetchScripts(true);
                }
            } catch (err) {
                // Skip non-JSON or malformed messages
            }
        };

        eventSource.onerror = () => {
            console.error('[Real-time] SSE Connection error. Reconnecting...');
        };

        return () => {
            eventSource.close();
        };
    }, [fetchScripts]);

    const handleCreateScript = async (data) => {
        try {
            setIsSubmitting(true);
            await scriptsApi.create(data);
            setShowForm(false);
            fetchScripts();
        } catch (err) {
            console.error('Error creating script:', err);
            alert('Erro ao criar script');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateScript = async (data) => {
        try {
            setIsSubmitting(true);
            await scriptsApi.update(editingScript.id, data);
            setEditingScript(null);
            fetchScripts();
        } catch (err) {
            console.error('Error updating script:', err);
            alert('Erro ao atualizar script');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (script) => {
        setScriptToDelete(script);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!scriptToDelete) return;
        try {
            setIsDeleting(true);
            await scriptsApi.delete(scriptToDelete.id);
            setDeleteModalOpen(false);
            setScriptToDelete(null);
            fetchScripts();
        } catch (err) {
            console.error('Error deleting script:', err);
            alert('Erro ao excluir script');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRegenerateToken = async (id) => {
        try {
            await scriptsApi.regenerateToken(id);
            fetchScripts();
        } catch (err) {
            console.error('Error regenerating token:', err);
            alert('Erro ao regenerar token');
        }
    };

    return (
        <div className="app-content">
            <div className="content-wrapper">
                <div className="content-panel">
                    {/* Filters */}
                    <FilterBar
                        search={search}
                        filter={filter}
                        onSearchChange={setSearch}
                        onFilterChange={setFilter}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                    />

                    {/* Error state */}
                    {error && (
                        <div className="glass-card border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6">
                            {error}
                        </div>
                    )}

                    {/* Loading state */}
                    {isLoading && scripts.length === 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="glass-card rounded-2xl h-48 animate-pulse" />
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoading && scripts.length === 0 && !error && (
                        <div className="text-center py-16">
                            <div className="inline-flex p-4 rounded-2xl glass mb-4">
                                <Bot className="w-12 h-12 text-gray-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-300 mb-2">
                                Nenhum script cadastrado
                            </h2>
                            <p className="text-gray-500 mb-6">
                                Crie seu primeiro script para começar a monitorar
                            </p>
                            <button
                                onClick={() => setShowForm(true)}
                                className="btn-primary inline-flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Criar Script
                            </button>
                        </div>
                    )}

                    {/* Scripts layout */}
                    {scripts.length > 0 && (
                        <div className={
                            viewMode === 'grid'
                                ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                                : "flex flex-col gap-3"
                        }>
                            {scripts.map((script) => (
                                <ScriptCard
                                    key={script.id}
                                    script={script}
                                    onDelete={handleDeleteClick}
                                    onEdit={setEditingScript}
                                    onRegenerateToken={handleRegenerateToken}
                                    viewMode={viewMode}
                                />
                            ))}
                        </div>
                    )}

                    {/* Stats footer */}
                    {scripts.length > 0 && (
                        <div className="mt-8 text-center text-sm text-gray-500">
                            {scripts.length} script{scripts.length !== 1 ? 's' : ''} monitorado{scripts.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit script modal */}
            {(showForm || editingScript) && (
                <ScriptForm
                    initialData={editingScript}
                    onSubmit={editingScript ? handleUpdateScript : handleCreateScript}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingScript(null);
                    }}
                    isLoading={isSubmitting}
                />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setScriptToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title={`Excluir "${scriptToDelete?.name}"?`}
                message="Esta ação é irreversível. Deseja realmente excluir este script?"
                confirmText="Excluir Script"
                isLoading={isDeleting}
            />
        </div>
    );
}

