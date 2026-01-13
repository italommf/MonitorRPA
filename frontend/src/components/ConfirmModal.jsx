import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirmar exclusão',
    message,
    confirmText = 'Excluir',
    cancelText = 'Cancelar',
    isLoading = false,
    variant = 'danger', // 'danger' | 'warning'
}) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: 'bg-red-500/10',
            iconColor: 'text-red-400',
            button: 'bg-red-500 hover:bg-red-600 text-white',
        },
        warning: {
            icon: 'bg-orange-500/10',
            iconColor: 'text-orange-400',
            button: 'bg-orange-500 hover:bg-orange-600 text-white',
        },
    };

    const styles = variantStyles[variant] || variantStyles.danger;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !isLoading) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={handleBackdropClick}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn">
                {/* Close button */}
                <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                    <X className="w-5 h-5 text-gray-400" />
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className={`p-4 rounded-full ${styles.icon}`}>
                        <AlertTriangle className={`w-8 h-8 ${styles.iconColor}`} />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-white text-center mb-2">
                    {title}
                </h2>

                {/* Message */}
                <p className="text-gray-400 text-center mb-6">
                    {message}
                </p>

                {/* Warning box */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-6">
                    <p className="text-sm text-red-400 text-center">
                        ⚠️ O webhook associado também será excluído e deixará de funcionar!
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 btn-ghost py-2.5"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-colors ${styles.button} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? 'Excluindo...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
