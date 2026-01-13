import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useHeader } from '../context/HeaderContext';
import { BarChart3, Activity, Server, AlertTriangle, Trophy, Clock, XCircle, Timer } from 'lucide-react';
import { dashboardApi } from '../services/api';
import { formatRelativeTime } from '../utils/helpers';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchStats = useCallback(async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const { data } = await dashboardApi.getStats();
            setStats(data);
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, []);

    const { updateHeader } = useHeader();

    useEffect(() => {
        updateHeader({
            onRefresh: fetchStats,
            isRefreshing: isLoading,
            actions: null
        });
    }, [fetchStats, isLoading, updateHeader]);

    useEffect(() => {
        fetchStats();
        // Fallback polling every 30 seconds
        const interval = setInterval(() => fetchStats(true), 30000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    // Real-time updates via SSE
    useEffect(() => {
        const eventSource = new EventSource('/api/events');

        eventSource.onmessage = (event) => {
            try {
                if (event.data.trim() === ': heartbeat') return;
                const data = JSON.parse(event.data);
                // Refresh on any webhook event (script or system)
                if (data.type === 'webhook_received' || data.type === 'system_ping') {
                    console.log('[Dashboard] Real-time update received');
                    fetchStats(true);
                }
            } catch (err) {
                // Skip non-JSON or malformed messages
            }
        };

        eventSource.onerror = () => {
            console.error('[Dashboard] SSE Connection error. Reconnecting...');
        };

        return () => {
            eventSource.close();
        };
    }, [fetchStats]);

    const metrics = [
        {
            label: 'Scripts Ativos',
            value: stats ? stats.scripts.active : '—',
            total: stats ? stats.scripts.total : null,
            icon: Activity,
            bgColor: 'bg-blue-500/10',
            textColor: 'text-blue-400',
            link: '/scripts',
        },
        {
            label: 'Sistemas Online',
            value: stats ? stats.systems.active : '—',
            total: stats ? stats.systems.total : null,
            icon: Server,
            bgColor: 'bg-green-500/10',
            textColor: 'text-green-400',
            link: '/systems',
        },
        {
            label: 'Execuções Hoje',
            value: stats ? stats.executions_today : '—',
            total: null,
            icon: BarChart3,
            bgColor: 'bg-purple-500/10',
            textColor: 'text-purple-400',
            link: null,
        },
        {
            label: 'Alertas',
            value: stats ? stats.alerts : '—',
            total: null,
            icon: AlertTriangle,
            bgColor: 'bg-orange-500/10',
            textColor: 'text-orange-400',
            link: null,
        },
    ];

    const formatDelay = (seconds) => {
        if (!seconds) return '—';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${minutes}min`;
    };

    const formatShortDateTime = (isoString) => {
        if (!isoString) return '—';
        const date = new Date(isoString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="app-content">
            <div className="content-wrapper">
                <div className="content-panel">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-2">Dashboard</h2>
                        <p className="text-gray-400">Visão geral do monitoramento</p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {metrics.map(({ label, value, total, icon: Icon, bgColor, textColor, link }) => {
                            const CardWrapper = link ? Link : 'div';
                            const cardProps = link ? { to: link } : {};
                            return (
                                <CardWrapper
                                    key={label}
                                    className={`glass-card rounded-2xl p-6 ${link ? 'cursor-pointer hover:border-white/20' : ''}`}
                                    {...cardProps}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`p-3 rounded-xl ${bgColor}`}>
                                            <Icon className={`w-6 h-6 ${textColor}`} />
                                        </div>
                                    </div>
                                    <div className="mb-1">
                                        {isLoading ? (
                                            <div className="h-9 w-16 bg-white/5 rounded animate-pulse" />
                                        ) : (
                                            <div>
                                                <span className="text-3xl font-bold text-white">{value}</span>
                                                {total && (
                                                    <span className="text-lg text-gray-500 ml-1">/{total}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-400">{label}</div>
                                </CardWrapper>
                            );
                        })}
                    </div>

                    {/* Detailed Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Most Executed Script */}
                        <div className="glass-card rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-xl bg-yellow-500/10">
                                    <Trophy className="w-5 h-5 text-yellow-400" />
                                </div>
                                <h3 className="font-semibold text-white">Script Mais Executado</h3>
                            </div>
                            {isLoading ? (
                                <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
                            ) : stats?.details?.most_executed_script ? (
                                <div className="flex items-center justify-between">
                                    <Link
                                        to={`/scripts/${stats.details.most_executed_script.id}`}
                                        className="text-blue-400 hover:text-blue-300 font-medium"
                                    >
                                        {stats.details.most_executed_script.name}
                                    </Link>
                                    <span className="text-2xl font-bold text-white">
                                        {stats.details.most_executed_script.count}
                                        <span className="text-sm text-gray-500 ml-1 font-normal">exec.</span>
                                    </span>
                                </div>
                            ) : (
                                <p className="text-gray-500">Nenhuma execução registrada</p>
                            )}
                        </div>

                        {/* Last Executed Script */}
                        <div className="glass-card rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-xl bg-green-500/10">
                                    <Clock className="w-5 h-5 text-green-400" />
                                </div>
                                <h3 className="font-semibold text-white">Última Execução</h3>
                            </div>
                            {isLoading ? (
                                <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
                            ) : stats?.details?.last_executed_script ? (
                                <div className="flex items-center justify-between">
                                    <Link
                                        to={`/scripts/${stats.details.last_executed_script.id}`}
                                        className="text-blue-400 hover:text-blue-300 font-medium"
                                    >
                                        {stats.details.last_executed_script.name}
                                    </Link>
                                    <span className="text-2xl font-bold text-white whitespace-nowrap">
                                        {formatShortDateTime(stats.details.last_executed_script.executed_at)}
                                    </span>
                                </div>
                            ) : (
                                <p className="text-gray-500">Nenhuma execução registrada</p>
                            )}
                        </div>

                        {/* Stopped Systems */}
                        <div className="glass-card rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-xl bg-red-500/10">
                                    <XCircle className="w-5 h-5 text-red-400" />
                                </div>
                                <h3 className="font-semibold text-white">Sistemas Parados</h3>
                            </div>
                            {isLoading ? (
                                <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
                            ) : stats?.details?.stopped_systems?.length > 0 ? (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {stats.details.stopped_systems.map((sys) => (
                                        <div key={sys.id} className="flex items-center justify-between py-1">
                                            <Link
                                                to="/systems"
                                                className="text-red-400 hover:text-red-300 font-medium text-sm truncate mr-2"
                                            >
                                                {sys.name}
                                            </Link>
                                            <span className="text-sm font-medium text-white whitespace-nowrap">
                                                {formatShortDateTime(sys.last_ping)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-green-400">Todos os sistemas estão ativos</p>
                            )}
                        </div>

                        {/* Delayed Scripts */}
                        <div className="glass-card rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-xl bg-orange-500/10">
                                    <Timer className="w-5 h-5 text-orange-400" />
                                </div>
                                <h3 className="font-semibold text-white">Scripts Atrasados</h3>
                            </div>
                            {isLoading ? (
                                <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
                            ) : stats?.details?.delayed_scripts?.length > 0 ? (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {stats.details.delayed_scripts.map((script) => (
                                        <div key={script.id} className="flex items-center justify-between py-1">
                                            <Link
                                                to={`/scripts/${script.id}`}
                                                className="text-orange-400 hover:text-orange-300 font-medium text-sm truncate mr-2"
                                            >
                                                {script.name}
                                            </Link>
                                            <span className="text-sm font-medium text-white whitespace-nowrap">
                                                {formatShortDateTime(script.last_execution)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-green-400">Nenhum script atrasado</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
