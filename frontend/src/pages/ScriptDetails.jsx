import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Copy, Check, Clock, AlertTriangle, Terminal,
    RefreshCw, Trash2, Edit2, Bot, ChevronDown, ChevronUp
} from 'lucide-react';
import { scriptsApi, executionsApi } from '../services/api';
import { useHeader } from '../context/HeaderContext';
import StatusBadge from '../components/StatusBadge';
import ExecutionHistory from '../components/ExecutionHistory';
import ScriptForm from '../components/ScriptForm';
import { formatDateTime, formatRelativeTime, copyToClipboard } from '../utils/helpers';

export default function ScriptDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [script, setScript] = useState(null);
    const [executions, setExecutions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingExecutions, setIsLoadingExecutions] = useState(true);
    const [copied, setCopied] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('curl');
    const [isExamplesExpanded, setIsExamplesExpanded] = useState(true);
    const [codeCopied, setCodeCopied] = useState(false);

    const { updateHeader } = useHeader();

    useEffect(() => {
        updateHeader({
            onRefresh: () => {
                fetchScript(true);
                fetchExecutions(true);
            },
            isRefreshing: isLoading || isLoadingExecutions,
            actions: script ? (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/scripts')}
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
    }, [isLoading, isLoadingExecutions, updateHeader, id, script, navigate]); // Added script to deps

    useEffect(() => {
        fetchScript();
        fetchExecutions();
    }, [id]);

    // Real-time updates via SSE
    useEffect(() => {
        const eventSource = new EventSource('/api/events');

        eventSource.onmessage = (event) => {
            try {
                if (event.data.trim() === ': heartbeat') return;

                const data = JSON.parse(event.data);
                if (data.type === 'webhook_received' && String(data.data.script_id) === String(id)) {
                    console.log('[Real-time] Webhook received for this script');
                    fetchScript(true);
                    fetchExecutions(true);
                }
            } catch (err) {
                // Ignore heartbeats/errors
            }
        };

        eventSource.onerror = (err) => {
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [id]);

    const fetchScript = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const { data } = await scriptsApi.getById(id);
            setScript(data);
        } catch (err) {
            console.error('Error fetching script:', err);
            if (err.response?.status === 404) {
                navigate('/');
            }
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const fetchExecutions = async (silent = false) => {
        try {
            if (!silent) setIsLoadingExecutions(true);
            const { data } = await executionsApi.listByScript(id, { limit: 50 });
            setExecutions(data.items);
        } catch (err) {
            console.error('Error fetching executions:', err);
        } finally {
            if (!silent) setIsLoadingExecutions(false);
        }
    };

    const handleCopyWebhook = async () => {
        const webhookUrl = `${window.location.origin}/webhook/${script.webhook_token}`;
        const success = await copyToClipboard(webhookUrl);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleUpdate = async (data) => {
        try {
            setIsSubmitting(true);
            await scriptsApi.update(id, data);
            setShowEditForm(false);
            fetchScript();
        } catch (err) {
            console.error('Error updating script:', err);
            alert('Erro ao atualizar script');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm(`Tem certeza que deseja excluir "${script.name}"? Esta ação não pode ser desfeita.`)) {
            try {
                await scriptsApi.delete(id);
                navigate('/');
            } catch (err) {
                console.error('Error deleting script:', err);
                alert('Erro ao excluir script');
            }
        }
    };

    const handleRegenerateToken = async () => {
        if (window.confirm('Regenerar o token vai invalidar o webhook atual. Continuar?')) {
            try {
                await scriptsApi.regenerateToken(id);
                fetchScript();
            } catch (err) {
                console.error('Error regenerating token:', err);
                alert('Erro ao regenerar token');
            }
        }
    };

    const handleCopyCode = async () => {
        let code = '';
        const webhookUrl = `${window.location.origin}/webhook/${script.webhook_token}`;

        if (activeTab === 'curl') {
            code = script.calculate_average_time
                ? `curl -X POST "${webhookUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "status": "success",\n    "start_time": "2024-01-01T10:00:00Z"\n  }'`
                : `curl -X POST "${webhookUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"status": "success"}'`;
        } else if (activeTab === 'python') {
            if (script.calculate_average_time) {
                code = `import requests\nfrom datetime import datetime\n\nWEBHOOK_URL = "${webhookUrl}"\n\n# 1. No INÍCIO do seu script:\nrequests.post(WEBHOOK_URL, json={"status": "executing"}, timeout=10)\nstart_time = datetime.now().isoformat()\n\n# ... seu código principal aqui ...\n\n# 2. No FINAL do seu script:\ntry:\n    requests.post(WEBHOOK_URL, json={\n        "status": "success",\n        "start_time": start_time\n    }, timeout=10)\n    print("[MonitorRPA] Notificação enviada")\nexcept Exception as e:\n    print(f"[MonitorRPA] Erro: {e}")`;
            } else {
                code = `import requests\n\nWEBHOOK_URL = "${webhookUrl}"\n\ntry:\n    requests.post(WEBHOOK_URL, json={"status": "success"}, timeout=10)\n    print("[MonitorRPA] Notificação enviada")\nexcept Exception as e:\n    print(f"[MonitorRPA] Erro: {e}")`;
            }
        }

        const success = await copyToClipboard(code);
        if (success) {
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!script) {
        return null;
    }

    const webhookUrl = `${window.location.origin}/webhook/${script.webhook_token}`;

    return (
        <div className="app-content">
            <div className="content-wrapper">
                <div className="content-panel">
                    {/* Script info card */}
                    <div className="glass-card rounded-2xl p-6 mb-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                                    <Bot className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        {script.last_status && <StatusBadge status={script.last_status} />}
                                        <h1 className="text-2xl font-bold text-white">{script.name}</h1>
                                    </div>
                                    {script.description && (
                                        <p className="text-gray-400 mt-1">{script.description}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {script.is_delayed && (
                                    <span className="flex items-center gap-1 text-sm text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                                        <AlertTriangle className="w-4 h-4" />
                                        Atrasado
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                <div className="text-sm text-gray-500 mb-1">Última execução</div>
                                <div className="font-semibold text-white">
                                    {formatDateTime(script.last_execution)}
                                </div>
                            </div>

                            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                <div className="text-sm text-gray-500 mb-1">Total de execuções</div>
                                <div className="font-semibold text-white">
                                    {script.execution_count}
                                </div>
                            </div>

                            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                <div className="text-sm text-gray-500 mb-1">Frequência</div>
                                <div className="font-semibold text-white capitalize">
                                    {script.frequency === 'scheduled' ? 'Horários Fixos' :
                                        script.frequency === 'custom' ? 'Personalizado' :
                                            script.frequency || 'Não definida'}
                                </div>
                            </div>
                        </div>

                        {/* Frequency Details (Conditional) */}
                        {script.frequency === 'scheduled' && script.scheduled_times && (
                            <div className="mb-6 p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block mb-3">Horários de Monitoramento</span>
                                <div className="flex flex-wrap gap-2">
                                    {script.scheduled_times.split(',').map(time => (
                                        <div key={time} className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-sm text-purple-300 font-mono font-bold">
                                            {time}
                                        </div>
                                    ))}
                                    <div className="ml-auto flex items-center gap-2 text-[10px] text-gray-500 italic">
                                        <Clock className="w-3 h-3" /> Janela de tolerância: {script.expected_interval || 60}m
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Webhook URL */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-300">Webhook URL</span>
                                <button
                                    onClick={handleRegenerateToken}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    Regenerar token
                                </button>
                            </div>
                            <div className="flex items-center gap-2 bg-black/40 rounded-xl p-3 border border-white/5">
                                <code className="flex-1 text-sm text-gray-300 break-all font-mono">
                                    {webhookUrl}
                                </code>
                                <button
                                    onClick={handleCopyWebhook}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                                    title="Copiar URL"
                                >
                                    {copied ? (
                                        <Check className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <Copy className="w-5 h-5 text-gray-500" />
                                    )}
                                </button>
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
                                                {activeTab === 'python' ? (
                                                    <code className="font-mono">
                                                        <span className="text-[#c586c0]">import</span> <span className="text-[#9cdcfe]">requests</span>{'\n'}
                                                        {script.calculate_average_time && (
                                                            <><span className="text-[#c586c0]">from</span> <span className="text-[#9cdcfe]">datetime</span> <span className="text-[#c586c0]">import</span> <span className="text-[#9cdcfe]">datetime</span>{'\n'}</>
                                                        )}
                                                        {'\n'}
                                                        <span className="text-[#9cdcfe]">WEBHOOK_URL</span> <span className="text-[#d4d4d4]">=</span> <span className="text-[#ce9178]">"{window.location.origin}/webhook/{script.webhook_token}"</span>{'\n\n'}

                                                        {script.calculate_average_time ? (
                                                            <>
                                                                <span className="text-[#6a9955]"># 1. No INÍCIO do seu script:</span>{'\n'}
                                                                <span className="text-[#9cdcfe]">requests</span><span className="text-[#d4d4d4]">.</span><span className="text-[#dcdcaa]">post</span>(<span className="text-[#9cdcfe]">WEBHOOK_URL</span>, <span className="text-[#9cdcfe]">json</span><span className="text-[#d4d4d4]">=</span>{'{'}<span className="text-[#ce9178]">"status"</span>: <span className="text-[#ce9178]">"executing"</span>{'}'}, <span className="text-[#9cdcfe]">timeout</span><span className="text-[#d4d4d4]">=</span><span className="text-[#b5cea8]">10</span>){'\n'}
                                                                <span className="text-[#9cdcfe]">start_time</span> <span className="text-[#d4d4d4]">=</span> <span className="text-[#9cdcfe]">datetime</span><span className="text-[#d4d4d4]">.</span><span className="text-[#dcdcaa]">now</span>()<span className="text-[#d4d4d4]">.</span><span className="text-[#dcdcaa]">isoformat</span>(){'\n\n'}
                                                                <span className="text-[#6a9955]"># ... seu código principal aqui ...</span>{'\n\n'}
                                                                <span className="text-[#6a9955]"># 2. No FINAL do seu script:</span>{'\n'}
                                                            </>
                                                        ) : null}

                                                        <span className="text-[#c586c0]">try</span>:{'\n'}
                                                        <span className="text-[#d4d4d4]">    </span><span className="text-[#9cdcfe]">requests</span><span className="text-[#d4d4d4]">.</span><span className="text-[#dcdcaa]">post</span>(<span className="text-[#9cdcfe]">WEBHOOK_URL</span>, <span className="text-[#9cdcfe]">json</span><span className="text-[#d4d4d4]">=</span>{'{'}{'\n'}
                                                        <span className="text-[#d4d4d4]">        </span><span className="text-[#ce9178]">"status"</span>: <span className="text-[#ce9178]">"success"</span>
                                                        {script.calculate_average_time ? (
                                                            <>
                                                                ,{'\n'}<span className="text-[#d4d4d4]">        </span><span className="text-[#ce9178]">"start_time"</span>: <span className="text-[#9cdcfe]">start_time</span>
                                                            </>
                                                        ) : ''}{'\n'}
                                                        <span className="text-[#d4d4d4]">    </span>{'}'}, <span className="text-[#9cdcfe]">timeout</span><span className="text-[#d4d4d4]">=</span><span className="text-[#b5cea8]">10</span>){'\n'}
                                                        <span className="text-[#d4d4d4]">    </span><span className="text-[#dcdcaa]">print</span>(<span className="text-[#ce9178]">"[MonitorRPA] Notificação enviada"</span>){'\n'}
                                                        <span className="text-[#c586c0]">except</span> <span className="text-[#4ec9b0]">Exception</span> <span className="text-[#c586c0]">as</span> <span className="text-[#9cdcfe]">e</span>:{'\n'}
                                                        <span className="text-[#d4d4d4]">    </span><span className="text-[#dcdcaa]">print</span>(<span className="text-[#569cd6]">f</span><span className="text-[#ce9178]">"[MonitorRPA] Erro: </span><span className="text-[#d4d4d4]">{'{'}e{'}'}</span><span className="text-[#ce9178]">"</span>)
                                                    </code>
                                                ) : (
                                                    <code className="font-mono">
                                                        <span className="text-[#dcdcaa]">curl</span> <span className="text-[#9cdcfe]">-X</span> <span className="text-[#569cd6]">POST</span> <span className="text-[#ce9178]">"{window.location.origin}/webhook/{script.webhook_token}"</span> <span className="text-[#d4d4d4]">\</span>{'\n'}
                                                        {'     '}<span className="text-[#9cdcfe]">-H</span> <span className="text-[#ce9178]">"Content-Type: application/json"</span> <span className="text-[#d4d4d4]">\</span>{'\n'}
                                                        {'     '}<span className="text-[#9cdcfe]">-d</span> <span className="text-[#ce9178]">'{"{"}"status": "success"{"}"}'</span>
                                                    </code>
                                                )}
                                            </pre>
                                            <button onClick={handleCopyCode} className="absolute right-4 top-4 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5 text-gray-400">
                                                {codeCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Execution history */}
                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">
                                Histórico de Execuções
                            </h2>
                            <button
                                onClick={fetchExecutions}
                                disabled={isLoadingExecutions}
                                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                                title="Atualizar"
                            >
                                <RefreshCw className={`w-5 h-5 text-gray-500 ${isLoadingExecutions ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <ExecutionHistory
                            executions={executions}
                            isLoading={isLoadingExecutions}
                            showDuration={script?.calculate_average_time}
                        />
                    </div>
                </div>
            </div>
            {/* Edit modal */}
            {showEditForm && (
                <ScriptForm
                    initialData={script}
                    onSubmit={handleUpdate}
                    onCancel={() => setShowEditForm(false)}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
}

