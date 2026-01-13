import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Copy, Check, Bot, User } from 'lucide-react';
import { formatRelativeTime, copyToClipboard } from '../utils/helpers';

export default function ScriptCard({ script, onDelete, onEdit, onRegenerateToken, viewMode = 'grid' }) {
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    const handleCopyWebhook = async (e) => {
        e.stopPropagation();
        const webhookUrl = `${window.location.origin}/webhook/${script.webhook_token}`;
        const success = await copyToClipboard(webhookUrl);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCardClick = () => {
        navigate(`/scripts/${script.id}`);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        onDelete(script); // Pass the entire script object to parent
    };

    const handleEditClick = (e) => {
        e.stopPropagation();
        onEdit(script);
    };

    const handleRegenerate = (e) => {
        e.stopPropagation();
        if (window.confirm('Regenerar o token vai invalidar o webhook atual. Continuar?')) {
            onRegenerateToken(script.id);
        }
    };

    // Determine status for icon coloring
    const isRunning = script.last_status === 'running';
    const hasError = script.last_status === 'error' || script.is_delayed;
    const isSuccess = script.last_status === 'success' || script.last_status === 'executed';

    const getFrequencyLabel = (freq) => {
        switch (freq) {
            case 'scheduled': return 'Horários Fixos';
            case 'custom': return 'Personalizado';
            case 'biweekly': return 'Quinzenal';
            case 'daily': return 'Diário';
            case 'weekly': return 'Semanal';
            case 'monthly': return 'Mensal';
            default: return freq;
        }
    };

    if (viewMode === 'list') {
        return (
            <div
                onClick={handleCardClick}
                className="group relative glass-card rounded-xl p-3 px-5 cursor-pointer animate-fadeIn hover:bg-white/5 transition-all flex items-center gap-6 border border-white/5"
            >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                    <div className={`p-2 rounded-xl ${hasError ? 'bg-red-500/10' :
                        isRunning ? 'bg-blue-500/10' :
                            isSuccess ? 'bg-green-500/10' : 'bg-gray-500/10'
                        }`}>
                        <Bot className={`w-4 h-4 ${hasError ? 'text-red-400' :
                            isRunning ? 'text-blue-400' :
                                isSuccess ? 'text-green-400' : 'text-gray-400'
                            }`} />
                    </div>
                </div>

                {/* Name and Description */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-white truncate text-sm">
                            {script.name}
                        </h3>
                        {script.is_delayed && (
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" title="Atrasado" />
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${hasError ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            isSuccess ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                            }`}>
                            {script.last_status ? (
                                script.last_status === 'running' ? 'Executando' :
                                    script.last_status === 'success' ? 'Executou' :
                                        script.last_status === 'executed' ? 'Executou' :
                                            script.last_status === 'error' ? 'Erro' :
                                                script.last_status === 'missed' ? 'Não rodou' :
                                                    script.last_status === 'pending' ? 'Ainda não rodou' :
                                                        script.last_status === 'delayed' ? 'Atrasado' : 'Aguardando'
                            ) : 'Nunca executou'}
                        </span>
                    </div>
                </div>

                {/* Last Execution */}
                <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 w-48">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="truncate">
                        {script.last_execution ? formatRelativeTime(script.last_execution) : 'Nunca'}
                    </span>
                </div>

                {/* Copy Webhook */}
                <button
                    onClick={handleCopyWebhook}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                    title="Copiar webhook URL"
                >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
            </div>
        );
    }

    // Grid View (Default) - Same style as Systems cards
    return (
        <div
            onClick={handleCardClick}
            className="glass-card rounded-2xl p-5 cursor-pointer animate-fadeIn hover:border-white/20 transition-all"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${hasError ? 'bg-red-500/10' :
                        isRunning ? 'bg-blue-500/10' :
                            isSuccess ? 'bg-green-500/10' : 'bg-gray-500/10'
                        }`}>
                        <Bot className={`w-5 h-5 ${hasError ? 'text-red-400' :
                            isRunning ? 'text-blue-400' :
                                isSuccess ? 'text-green-400' : 'text-gray-400'
                            }`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">{script.name}</h3>
                        {script.description && (
                            <p className="text-sm text-gray-400 line-clamp-1">{script.description}</p>
                        )}
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${hasError ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    isRunning ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        isSuccess ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                    }`}>
                    {script.last_status ? (
                        script.last_status === 'running' ? 'Executando' :
                            script.last_status === 'success' ? 'Executou' :
                                script.last_status === 'executed' ? 'Executou' :
                                    script.last_status === 'error' ? 'Erro' :
                                        script.last_status === 'missed' ? 'Não rodou' :
                                            script.last_status === 'pending' ? 'Ainda não rodou' :
                                                script.last_status === 'delayed' ? 'Atrasado' : 'Aguardando'
                    ) : 'Nunca executou'}
                </span>
            </div>

            {/* Info */}
            <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{getFrequencyLabel(script.frequency)}</span>
                </div>
                {script.is_delayed && (
                    <span className="flex items-center gap-1 text-orange-400">
                        <AlertTriangle className="w-4 h-4" />
                        Atrasado
                    </span>
                )}
                {script.last_execution && (
                    <div>
                        Última: {formatRelativeTime(script.last_execution)}
                    </div>
                )}
            </div>

            {/* Responsible */}
            {script.responsible && (
                <div className="flex items-center gap-2 text-xs text-blue-400/80 mb-4">
                    <User className="w-3.5 h-3.5" />
                    <span className="font-medium">Responsável: {script.responsible.name}</span>
                </div>
            )}

            {/* Webhook URL */}
            <div className="bg-black/30 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between gap-2">
                    <code className="text-xs text-gray-400 truncate flex-1">
                        {window.location.origin}/webhook/{script.webhook_token}
                    </code>
                    <button
                        onClick={handleCopyWebhook}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                        title="Copiar URL"
                    >
                        {copied ? (
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
                    onClick={(e) => { e.stopPropagation(); navigate(`/scripts/${script.id}`); }}
                    className="btn-ghost text-sm"
                >
                    Ver mais
                </button>
                <button
                    onClick={handleEditClick}
                    className="btn-ghost text-sm"
                >
                    Editar
                </button>
                <button
                    onClick={handleDeleteClick}
                    className="btn-ghost text-sm text-red-400 hover:text-red-300"
                >
                    Excluir
                </button>
            </div>
        </div>
    );
}
