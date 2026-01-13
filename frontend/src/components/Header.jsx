import { NavLink } from 'react-router-dom';
import { Bot, LayoutDashboard, Code, Server, RefreshCw } from 'lucide-react';

export default function Header({ onRefresh, isRefreshing, actions }) {
    const navItems = [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/scripts', label: 'Scripts', icon: Code },
        { to: '/systems', label: 'Sistemas', icon: Server },
    ];

    return (
        <header className="app-header">
            <div className="app-header-inner">
                {/* Logo */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">MonitorRPA</h1>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex items-center gap-1">
                        {navItems.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                        ? 'bg-white/10 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`
                                }
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="btn-ghost flex items-center gap-2"
                            title="Atualizar"
                        >
                            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                    {actions}
                </div>
            </div>
        </header>
    );
}
