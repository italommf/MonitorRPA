import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';

const timeoutUnitOptions = [
    { value: 'seconds', label: 'Segundos' },
    { value: 'minutes', label: 'Minutos' },
    { value: 'hours', label: 'Horas' },
];

export default function SystemForm({ initialData, onSubmit, onCancel, isLoading }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        timeout_value: 5,
        timeout_unit: 'minutes',
    });
    const [isUnitOpen, setIsUnitOpen] = useState(false);
    const unitDropdownRef = useRef(null);

    useEffect(() => {
        if (initialData) {
            const storedMinutes = initialData.timeout_interval || 5;
            let value, unit;

            if (storedMinutes >= 60 && storedMinutes % 60 === 0) {
                value = storedMinutes / 60;
                unit = 'hours';
            } else if (storedMinutes < 1) {
                value = Math.round(storedMinutes * 60);
                unit = 'seconds';
            } else {
                value = storedMinutes;
                unit = 'minutes';
            }

            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                timeout_value: value,
                timeout_unit: unit,
            });
        }
    }, [initialData]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target)) {
                setIsUnitOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();

        let timeoutInMinutes;
        switch (formData.timeout_unit) {
            case 'seconds':
                timeoutInMinutes = formData.timeout_value / 60;
                break;
            case 'hours':
                timeoutInMinutes = formData.timeout_value * 60;
                break;
            default:
                timeoutInMinutes = formData.timeout_value;
        }

        onSubmit({
            name: formData.name,
            description: formData.description,
            timeout_interval: timeoutInMinutes,
        });
    };

    const handleChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: field === 'timeout_value' ? parseInt(value) || 1 : value,
        }));
    };

    const getUnitLabel = () => {
        const unit = timeoutUnitOptions.find(u => u.value === formData.timeout_unit);
        return unit ? unit.label.toLowerCase() : 'minutos';
    };

    const activeUnit = timeoutUnitOptions.find(u => u.value === formData.timeout_unit) || timeoutUnitOptions[1];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative glass-card rounded-2xl w-full max-w-md p-6 animate-fadeIn">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">
                        {initialData ? 'Editar Sistema' : 'Novo Sistema'}
                    </h2>
                    <button
                        onClick={onCancel}
                        className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Nome do Sistema *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="input-dark"
                            placeholder="Ex: Servidor de Produção"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Descrição
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            className="input-dark min-h-[80px] resize-none"
                            placeholder="Descrição opcional do sistema"
                            rows={3}
                        />
                    </div>

                    {/* Timeout Interval with Custom Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Intervalo de Timeout *
                        </label>
                        <div className="flex gap-3">
                            {/* Number Input */}
                            <input
                                type="number"
                                name="timeout_value"
                                value={formData.timeout_value}
                                onChange={(e) => handleChange('timeout_value', e.target.value)}
                                className="input-dark flex-[2]"
                                min={1}
                                max={formData.timeout_unit === 'seconds' ? 3600 : formData.timeout_unit === 'hours' ? 24 : 1440}
                                required
                            />

                            {/* Custom Dropdown */}
                            <div className="relative flex-1" ref={unitDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsUnitOpen(!isUnitOpen)}
                                    className={`flex items-center gap-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] w-full rounded-xl px-4 py-2.5 transition-all hover:bg-white/10 ${isUnitOpen ? 'ring-2 ring-blue-500/50 border-blue-500' : ''}`}
                                >
                                    <span className="flex-1 text-left text-white text-sm truncate">
                                        {activeUnit.label}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isUnitOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isUnitOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl animate-fadeIn">
                                        <div className="py-1">
                                            {timeoutUnitOptions.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => {
                                                        handleChange('timeout_unit', opt.value);
                                                        setIsUnitOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/10 flex items-center justify-between ${formData.timeout_unit === opt.value ? 'text-blue-400 bg-blue-500/10' : 'text-gray-300'}`}
                                                >
                                                    {opt.label}
                                                    {formData.timeout_unit === opt.value && <Check className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Se não receber ping em {formData.timeout_value} {getUnitLabel()}, o sistema será marcado como parado.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 btn-ghost"
                            disabled={isLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 btn-primary"
                            disabled={isLoading || !formData.name}
                        >
                            {isLoading ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
