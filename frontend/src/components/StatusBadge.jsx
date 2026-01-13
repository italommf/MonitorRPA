import { getStatusColor } from '../utils/helpers';

const statusLabels = {
    success: 'Executou',
    error: 'Erro',
    warning: 'Aviso',
    missed: 'Não rodou',
    pending: 'Ainda não rodou',
    delayed: 'Atrasado',
};

// Dark theme status colors
const darkStatusColors = {
    success: {
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        border: 'border-green-500/20',
        dot: 'bg-green-500',
    },
    error: {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/20',
        dot: 'bg-red-500',
    },
    warning: {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/20',
        dot: 'bg-yellow-500',
    },
    missed: {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/20',
        dot: 'bg-red-500',
    },
    pending: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/20',
        dot: 'bg-blue-400',
    },
    delayed: {
        bg: 'bg-orange-500/10',
        text: 'text-orange-400',
        border: 'border-orange-500/20',
        dot: 'bg-orange-500',
    },
    default: {
        bg: 'bg-white/5',
        text: 'text-gray-400',
        border: 'border-white/10',
        dot: 'bg-gray-500',
    },
};

export default function StatusBadge({ status, showDot = true, size = 'md' }) {
    const colors = darkStatusColors[status?.toLowerCase()] || darkStatusColors.default;
    const label = statusLabels[status?.toLowerCase()] || status || 'Desconhecido';

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
        lg: 'text-base px-3 py-1.5',
    };

    return (
        <span
            className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${colors.bg} ${colors.text} ${colors.border} border
        ${sizeClasses[size]}
      `}
        >
            {showDot && (
                <span className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`} />
            )}
            {label}
        </span>
    );
}
