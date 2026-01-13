import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Copy, Check, Clock, Edit2, Trash2, Server,
    RefreshCw, Terminal, ChevronDown, ChevronUp, Activity,
    Link as LinkIcon
} from 'lucide-react';
import { systemsApi } from '../services/api';
import { useHeader } from '../context/HeaderContext';
import SystemForm from '../components/SystemForm';
import { formatDateTime, formatRelativeTime, copyToClipboard } from '../utils/helpers';

export default function SystemDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [system, setSystem] = useState(null);
    const [pings, setPings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingPings, setIsLoadingPings] = useState(true);
    const [copied, setCopied] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('python');
    const [isExamplesExpanded, setIsExamplesExpanded] = useState(true);
    const [codeCopied, setCodeCopied] = useState(false);

    const { updateHeader } = useHeader();

    const fetchSystem = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const { data } = await systemsApi.getById(id);
            setSystem(data);
        } catch (err) {
            console.error('Error fetching system:', err);
            if (err.response?.status === 404) {
                navigate('/systems');
            }
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const fetchPings = async (silent = false) => {
        try {
            if (!silent) setIsLoadingPings(true);
            const { data } = await systemsApi.listPings(id, { limit: 50 });
            setPings(data.items);
        } catch (err) {
            console.error('Error fetching pings:', err);
        } finally {
            if (!silent) setIsLoadingPings(false);
        }
    };

    useEffect(() => {
        updateHeader({
            onRefresh: () => {
                fetchSystem(true);
                fetchPings(true);
            },
            isRefreshing: isLoading || isLoadingPings,
            actions: system ? (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/systems')}
                        className="btn-ghost flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </button>
                    <button
                        onClick={() => setShowEditForm(true)}
                        className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                        title="Editar"
                    >
                        <Edit2 className="w-5 h-5 text-gray-400" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-2 rounded-xl hover:bg-red-500/10 transition-colors"
                        title="Excluir"
                    >
                        <Trash2 className="w-5 h-5 text-red-400" />
                    </button>
                </div>
            ) : null
        });
    }, [isLoading, isLoadingPings, updateHeader, id, system, navigate]);

    useEffect(() => {
        fetchSystem();
        fetchPings();
    }, [id]);

    // Real-time updates
    useEffect(() => {
        const eventSource = new EventSource('/api/events');
        eventSource.onmessage = (event) => {
            try {
                if (event.data.trim() === ': heartbeat') return;
                const data = JSON.parse(event.data);
                if (data.type === 'system_ping' && String(data.data.system_id) === String(id)) {
                    fetchSystem(true);
                    fetchPings(true);
                }
            } catch (err) { }
        };
        eventSource.onerror = () => eventSource.close();
        return () => eventSource.close();
    }, [id]);

    const handleCopyWebhook = async () => {
        const webhookUrl = `${window.location.origin}/system/${system.webhook_token}`;
        const success = await copyToClipboard(webhookUrl);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleUpdate = async (data) => {
        try {
            setIsSubmitting(true);
            await systemsApi.update(id, data);
            setShowEditForm(false);
            fetchSystem();
        } catch (err) {
            console.error('Error updating system:', err);
            alert('Erro ao atualizar sistema');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm(`Tem certeza que deseja excluir "${system.name}"?`)) {
            try {
                await systemsApi.delete(id);
                navigate('/systems');
            } catch (err) {
                console.error('Error deleting system:', err);
                alert('Erro ao excluir sistema');
            }
        }
    };

    const handleCopyCode = async () => {
        let code = '';
        const webhookUrl = `${window.location.origin}/system/${system.webhook_token}`;
        if (activeTab === 'curl') {
            code = `curl -X POST "${webhookUrl}" \\
     -H "Content-Type: application/json" \\
     -d '{"status": true}'`;
        } else if (activeTab === 'python') {
            code = `import requests\n\nurl = "${webhookUrl}"\nrequests.post(url, json={"status": True})`;
        }
        const success = await copyToClipboard(code);
        if (success) {
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        }
    };

    const renderCode = (lang) => {
        const webhookUrl = `${window.location.origin}/system/${system.webhook_token}`;

        if (lang === 'python') {
            return (
                <code className="font-mono">
                    <span className="text-[#c586c0]">import</span> <span className="text-[#9cdcfe]">requests</span>{'\n\n'}
                    <span className="text-[#9cdcfe]">url</span> <span className="text-[#d4d4d4]">=</span> <span className="text-[#ce9178]">"{webhookUrl}"</span>{'\n'}
                    <span className="text-[#9cdcfe]">requests</span><span className="text-[#d4d4d4]">.</span><span className="text-[#dcdcaa]">post</span>(
                    <span className="text-[#9cdcfe]">url</span>,
                    <span className="text-[#9cdcfe]">json</span><span className="text-[#d4d4d4]">=</span>{'{'}
                    <span className="text-[#ce9178]">"status"</span>: <span className="text-[#569cd6]">True</span>
                    {'}'})
                </code>
            );
        }

        return (
            <code className="font-mono">
                <span className="text-[#dcdcaa]">curl</span> <span className="text-[#9cdcfe]">-X</span> <span className="text-[#569cd6]">POST</span> <span className="text-[#ce9178]">"{webhookUrl}"</span> <span className="text-[#d4d4d4]">\</span>{'\n'}
                {'     '}<span className="text-[#9cdcfe]">-H</span> <span className="text-[#ce9178]">"Content-Type: application/json"</span> <span className="text-[#d4d4d4]">\</span>{'\n'}
                {'     '}<span className="text-[#9cdcfe]">-d</span> <span className="text-[#ce9178]">'{"{"}"status": true{"}"}'</span>
            </code>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!system) return null;

    const webhookUrl = `${window.location.origin}/system/${system.webhook_token}`;

    return (
        <div className="app-content">
            <div className="content-wrapper">
                <div className="content-panel">
                    {/* System info card */}
                    <div className="glass-card rounded-2xl p-6 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${system.is_active ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                    <Server className={`w-8 h-8 ${system.is_active ? 'text-green-400' : 'text-red-400'}`} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white mb-1">{system.name}</h1>
                                    <p className="text-gray-400">{system.description || 'Sem descrição'}</p>
                                </div>
                            </div>
                            <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold uppercase tracking-wider ${system.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                <div className={`w-2.5 h-2.5 rounded-full ${system.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                {system.is_active ? 'Online' : 'Parado'}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-black/20 rounded-xl p-4">
                                <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Último Batimento</span>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-white font-medium">{formatRelativeTime(system.last_ping)}</span>
                                </div>
                            </div>
                            <div className="bg-black/20 rounded-xl p-4">
                                <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Intervalo de Espera</span>
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-gray-400" />
                                    <span className="text-white font-medium">{system.timeout_interval} minutos</span>
                                </div>
                            </div>
                            <div className="bg-black/20 rounded-xl p-4 sm:col-span-2">
                                <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Webhook URL</span>
                                <div className="flex items-center justify-between gap-2">
                                    <code className="text-xs text-blue-400/80 truncate flex-1">{webhookUrl}</code>
                                    <button onClick={handleCopyWebhook} className="p-1.5 hover:bg-white/10 rounded-lg transition-all">
                                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-500" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* How to use */}
                    <div className="glass-card rounded-2xl overflow-hidden mb-6">
                        <button
                            onClick={() => setIsExamplesExpanded(!isExamplesExpanded)}
                            className="w-full flex items-center justify-between p-4 px-6 hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-blue-400" />
                                <h2 className="text-lg font-bold text-white">Como integrar seu sistema</h2>
                            </div>
                            {isExamplesExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                        </button>

                        {isExamplesExpanded && (
                            <div className="p-6 pt-0 border-t border-white/5">
                                <div className="flex gap-4 mb-4 border-b border-white/5">
                                    <button onClick={() => setActiveTab('python')} className={`pb-2 px-1 text-sm font-medium transition-all relative ${activeTab === 'python' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                                        Python {activeTab === 'python' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                                    </button>
                                    <button onClick={() => setActiveTab('curl')} className={`pb-2 px-1 text-sm font-medium transition-all relative ${activeTab === 'curl' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                                        CURL {activeTab === 'curl' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                                    </button>
                                </div>
                                <div className="bg-[#1e1e1e] rounded-xl p-4 relative group border border-white/5 shadow-inner">
                                    <pre className="text-sm overflow-x-auto whitespace-pre">
                                        {renderCode(activeTab)}
                                    </pre>
                                    <button onClick={handleCopyCode} className="absolute right-4 top-4 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5 text-gray-400">
                                        {codeCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Ping History */}
                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white">Histórico de Eventos</h2>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <div className="w-2 h-2 rounded-full bg-green-500" /> Online
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 pl-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" /> Parado
                                </div>
                            </div>
                        </div>

                        {isLoadingPings ? (
                            <div className="flex flex-col gap-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
                            </div>
                        ) : pings.length === 0 ? (
                            <div className="text-center py-12">
                                <Activity className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                                <p className="text-gray-500 italic">Nenhum evento registrado ainda.</p>
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Vertical line */}
                                <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-white/5" />

                                <div className="space-y-6">
                                    {(() => {
                                        // Group consecutive pings by status
                                        const groups = [];
                                        let currentGroup = null;

                                        pings.forEach((ping) => {
                                            if (!currentGroup || currentGroup.status !== ping.status) {
                                                currentGroup = {
                                                    id: ping.id,
                                                    status: ping.status,
                                                    pings: [ping],
                                                    timestamp: ping.timestamp
                                                };
                                                groups.push(currentGroup);
                                            } else {
                                                currentGroup.pings.push(ping);
                                            }
                                        });

                                        return groups.map((group) => (
                                            <div key={group.id} className="relative pl-12">
                                                <div className={`absolute left-[18px] top-6 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-[#12121c] z-10 ${group.status ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />

                                                <div className={`glass-card rounded-xl border-white/5 overflow-hidden transition-colors ${group.status ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
                                                    {/* Group Header */}
                                                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-sm font-bold uppercase tracking-tight ${group.status ? 'text-green-400' : 'text-red-400'}`}>
                                                                {group.status ? 'Sistema Online' : 'Sistema Parou de Rodar'}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                ({group.pings.length} {group.pings.length === 1 ? 'evento' : 'eventos'})
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                                            <Clock className="w-3 h-3" />
                                                            {formatRelativeTime(group.timestamp)}
                                                        </div>
                                                    </div>

                                                    {/* Individual Pings List for Online status */}
                                                    {group.status && (
                                                        <div className="divide-y divide-white/5 bg-black/20 max-h-80 overflow-y-auto">
                                                            {group.pings.map((ping) => (
                                                                <div key={ping.id} className="p-3 pl-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                                                                        <span className="text-xs text-gray-300 font-mono">
                                                                            Ping recebido
                                                                        </span>
                                                                        {ping.client_info && (
                                                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-gray-500 font-mono">
                                                                                {ping.client_info}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 font-mono">
                                                                        {formatDateTime(ping.timestamp)}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Show timestamp for Offline status */}
                                                    {!group.status && (
                                                        <div className="p-3 pl-4 bg-black/20">
                                                            <div className="text-xs text-gray-500">
                                                                {formatDateTime(group.timestamp)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showEditForm && (
                <SystemForm
                    initialData={system}
                    onSubmit={handleUpdate}
                    onCancel={() => setShowEditForm(false)}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
}
