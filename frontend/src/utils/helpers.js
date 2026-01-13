/**
 * Format a date to relative time (e.g., "há 5 minutos")
 */
export function formatRelativeTime(date) {
    if (!date) return 'Nunca';

    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Há ${diffDays} dias`;

    return then.toLocaleDateString('pt-BR');
}

/**
 * Format a date to full datetime string
 */
export function formatDateTime(date) {
    if (!date) return 'Sem Registros';
    return new Date(date).toLocaleString('pt-BR');
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms) {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
}

/**
 * Get status color classes
 */
export function getStatusColor(status) {
    switch (status?.toLowerCase()) {
        case 'success':
            return {
                bg: 'bg-green-100',
                text: 'text-green-700',
                border: 'border-green-200',
                dot: 'bg-green-500',
            };
        case 'error':
            return {
                bg: 'bg-red-100',
                text: 'text-red-700',
                border: 'border-red-200',
                dot: 'bg-red-500',
            };
        case 'warning':
            return {
                bg: 'bg-yellow-100',
                text: 'text-yellow-700',
                border: 'border-yellow-200',
                dot: 'bg-yellow-500',
            };
        default:
            return {
                bg: 'bg-gray-100',
                text: 'text-gray-600',
                border: 'border-gray-200',
                dot: 'bg-gray-400',
            };
    }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
