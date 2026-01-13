import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, FileCode, Calendar, Clock, ArrowDownRight } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatDateTime, formatDuration, formatRelativeTime } from '../utils/helpers';

export default function ExecutionHistory({ executions, isLoading, showDuration }) {
    const [expandedId, setExpandedId] = useState(null);
    const [expandedDays, setExpandedDays] = useState({});

    const groupedExecutions = useMemo(() => {
        const groups = {};
        executions.forEach(exec => {
            const dateObj = new Date(exec.executed_at);
            const dateKey = dateObj.toLocaleDateString('pt-BR');
            if (!groups[dateKey]) {
                groups[dateKey] = {
                    date: dateObj,
                    items: []
                };
            }
            groups[dateKey].items.push(exec);
        });
        return Object.entries(groups).sort((a, b) => new Date(b[1].date) - new Date(a[1].date));
    }, [executions]);

    const toggleDay = (day) => {
        setExpandedDays(prev => ({
            ...prev,
            [day]: !prev[day]
        }));
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-card rounded-xl h-16 animate-pulse" />
                ))}
            </div>
        );
    }

    if (executions.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-2xl glass mb-4">
                    <FileCode className="w-10 h-10 text-gray-500" />
                </div>
                <p className="text-gray-400">Nenhuma execução registrada</p>
                <p className="text-sm text-gray-500 mt-1">Envie um POST para o webhook para registrar execuções</p>
            </div>
        );
    }

    const renderExecution = (exec, isNested = false) => (
        <div
            key={exec.id}
            className={`glass-card rounded-xl overflow-hidden mb-2 ${isNested ? 'ml-6 border-l-2 border-blue-500/20 bg-white/5' : ''}`}
        >
            {/* Header */}
            <button
                onClick={() => setExpandedId(expandedId === exec.id ? null : exec.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-3">
                            <StatusBadge status={exec.status} size="sm" />
                            <span className="text-sm font-medium text-gray-300">
                                <span className="text-gray-500 mr-2">Horário de execução:</span>
                                {new Date(exec.executed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                    {showDuration && exec.duration_ms && (
                        <span className="text-xs text-gray-400 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg">
                            <Clock className="w-3 h-3" />
                            <span className="text-gray-500 mr-1">Duração da execução:</span>
                            {formatDuration(exec.duration_ms)}
                        </span>
                    )}
                </div>
                {expandedId === exec.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
            </button>

            {/* Expanded content */}
            {expandedId === exec.id && (
                <div className="px-4 pb-4 border-t border-white/5 pt-3 animate-fadeIn">
                    <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {formatDateTime(exec.executed_at)}
                    </div>

                    {/* Error message */}
                    {exec.error_message && (
                        <div className="mb-3">
                            <span className="text-xs font-medium text-gray-500 uppercase">
                                Erro
                            </span>
                            <p className="text-red-400 text-sm mt-1 bg-red-500/10 p-2 rounded-xl border border-red-500/20">
                                {exec.error_message}
                            </p>
                        </div>
                    )}

                    {/* Payload */}
                    {exec.payload && (
                        <div>
                            <span className="text-xs font-medium text-gray-500 uppercase">
                                Payload
                            </span>
                            <pre className="mt-1 p-3 bg-black/40 rounded-xl text-xs text-gray-300 overflow-x-auto border border-white/5 font-mono">
                                {JSON.stringify(JSON.parse(exec.payload), null, 2)}
                            </pre>
                        </div>
                    )}

                    {/* Execution ID */}
                    <div className="mt-3 text-xs text-gray-600">
                        ID: {exec.id}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            {groupedExecutions.map(([dateKey, group]) => {
                const hasMultiple = group.items.length > 1;
                const isExpanded = expandedDays[dateKey];

                if (!hasMultiple) {
                    return (
                        <div key={dateKey}>
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {dateKey}
                                </span>
                            </div>
                            {renderExecution(group.items[0])}
                        </div>
                    );
                }

                return (
                    <div key={dateKey} className="space-y-2">
                        {/* Day Group Header */}
                        <button
                            onClick={() => toggleDay(dateKey)}
                            className="w-full flex items-center justify-between px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-semibold text-gray-300">
                                        {dateKey}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {group.items.length} execuções neste dia
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" />
                                )}
                            </div>
                        </button>

                        {/* Dropdown Items */}
                        {isExpanded && (
                            <div className="animate-slideDown overflow-hidden">
                                {group.items.map(exec => renderExecution(exec, true))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
