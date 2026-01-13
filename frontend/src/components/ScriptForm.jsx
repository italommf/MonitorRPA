import { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, Plus, User, Calendar, Clock, ChevronDown, Check, Trash2 } from 'lucide-react';
import { responsiblesApi } from '../services/api';

const frequencyOptions = [
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quinzenal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'scheduled', label: 'Horários Fixos' },
    { value: 'custom', label: 'Personalizado' },
];

export default function ScriptForm({ initialData, onSubmit, onCancel, isLoading }) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        description: initialData?.description || '',
        expected_interval: initialData?.expected_interval || '',
        responsible_id: initialData?.responsible_id || null,
        frequency: initialData?.frequency || 'daily',
        scheduled_times: initialData?.scheduled_times || '',
        calculate_average_time: initialData?.calculate_average_time || false,
    });
    const [responsibles, setResponsibles] = useState([]);
    const [isAddingResponsible, setIsAddingResponsible] = useState(false);
    const [newResponsibleName, setNewResponsibleName] = useState('');
    const [errors, setErrors] = useState({});
    const [presets, setPresets] = useState([15, 30, 60, 240, 720, 1440]); // default presets in minutes

    // Custom dropdown states
    const [isRespOpen, setIsRespOpen] = useState(false);
    const [isFreqOpen, setIsFreqOpen] = useState(false);
    const respDropdownRef = useRef(null);
    const freqDropdownRef = useRef(null);

    useEffect(() => {
        fetchResponsibles();

        // Load custom presets from localStorage
        const savedPresets = localStorage.getItem('monitor_rpa_presets');
        if (savedPresets) {
            try {
                setPresets(JSON.parse(savedPresets));
            } catch (e) {
                console.error('Error parsing presets:', e);
            }
        }
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (respDropdownRef.current && !respDropdownRef.current.contains(event.target)) {
                setIsRespOpen(false);
            }
            if (freqDropdownRef.current && !freqDropdownRef.current.contains(event.target)) {
                setIsFreqOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchResponsibles = async () => {
        try {
            const response = await responsiblesApi.list();
            setResponsibles(response.data);
        } catch (error) {
            console.error('Error fetching responsibles:', error);
        }
    };

    const handleAddResponsible = async () => {
        if (!newResponsibleName.trim()) return;
        console.log('[DEBUG] Iniciando criação de responsável:', newResponsibleName.trim());
        try {
            const response = await responsiblesApi.create({ name: newResponsibleName.trim() });
            const newResp = response.data;
            console.log('[DEBUG] Responsável criado com sucesso:', newResp);

            // Update list
            setResponsibles((prev) => {
                const updated = [...prev, newResp];
                console.log('[DEBUG] Lista de responsáveis atualizada:', updated);
                return updated;
            });

            // Selection: Use numeric ID
            console.log('[DEBUG] Selecionando responsible_id:', newResp.id);
            setFormData((prev) => ({ ...prev, responsible_id: newResp.id }));

            // Feedback
            alert(`Responsável "${newResp.name}" adicionado e selecionado com sucesso!`);

            // Reset UI states
            setNewResponsibleName('');
            setIsAddingResponsible(false);
            setIsRespOpen(false);
        } catch (error) {
            console.error('[DEBUG] Erro ao adicionar responsável:', error);
            console.error('[DEBUG] Response:', error.response?.data);
            alert('Erro ao adicionar responsável. Verifique se o nome já existe.');
        }
    };

    const handleSavePreset = () => {
        const val = parseInt(formData.expected_interval);
        if (val && val > 0 && !presets.includes(val)) {
            const newPresets = [...presets, val].sort((a, b) => a - b);
            setPresets(newPresets);
            localStorage.setItem('monitor_rpa_presets', JSON.stringify(newPresets));
        }
    };

    const handleRemovePreset = (val) => {
        const newPresets = presets.filter(p => p !== val);
        setPresets(newPresets);
        localStorage.setItem('monitor_rpa_presets', JSON.stringify(newPresets));
    };

    const formatPresetLabel = (min) => {
        if (min < 60) return `${min}m`;
        const hours = min / 60;
        if (hours < 24) return `${hours}h`;
        return `${hours / 24}d`;
    };

    const handleDeleteResponsible = async (respId, respName) => {
        if (!window.confirm(`Tem certeza que deseja excluir "${respName}"?`)) return;
        try {
            await responsiblesApi.delete(respId);
            setResponsibles((prev) => prev.filter(r => r.id !== respId));
            // Se o responsável excluído estava selecionado, limpar seleção
            if (formData.responsible_id === respId) {
                setFormData((prev) => ({ ...prev, responsible_id: null }));
            }
            alert(`Responsável "${respName}" excluído com sucesso!`);
        } catch (error) {
            console.error('[DEBUG] Erro ao excluir responsável:', error);
            alert('Erro ao excluir responsável.');
        }
    };

    const handleIncrement = (mins) => {
        const current = parseInt(formData.expected_interval) || 0;
        const next = Math.max(0, current + mins);
        handleChange('expected_interval', next);
    };

    const formatFullDuration = (min) => {
        if (!min || min <= 0) return 'Duração não definida';
        const h = Math.floor(min / 60);
        const m = min % 60;
        const hPart = h > 0 ? `${h}h` : '';
        const mPart = m > 0 ? `${m}m` : '';
        return `Janela de ${hPart}${hPart && mPart ? ' ' : ''}${mPart}`;
    };

    const handleAddTime = (time) => {
        if (!time) return;
        const currentTimes = formData.scheduled_times ? formData.scheduled_times.split(',') : [];
        if (!currentTimes.includes(time)) {
            const nextTimes = [...currentTimes, time].sort();
            handleChange('scheduled_times', nextTimes.join(','));
        }
    };

    const handleRemoveTime = (time) => {
        const currentTimes = formData.scheduled_times ? formData.scheduled_times.split(',') : [];
        const nextTimes = currentTimes.filter(t => t !== time);
        handleChange('scheduled_times', nextTimes.join(','));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = 'Nome é obrigatório';
        }
        if (formData.expected_interval && formData.expected_interval < 1) {
            newErrors.expected_interval = 'Intervalo deve ser maior que 0';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit({
                ...formData,
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                expected_interval: formData.expected_interval ? parseInt(formData.expected_interval) : null,
                scheduled_times: formData.frequency === 'scheduled' ? formData.scheduled_times : null,
                responsible_id: formData.responsible_id ? parseInt(formData.responsible_id) : null,
            });
        }
    };

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    // Normalizar responsible_id para comparação (pode ser string ou number)
    const normalizedRespId = formData.responsible_id ? Number(formData.responsible_id) : null;
    const activeResponsible = responsibles.find(r => r.id === normalizedRespId);
    const activeFrequency = frequencyOptions.find(f => f.value === formData.frequency) || frequencyOptions[0];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg animate-fadeIn max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-[#12121a] z-10 flex items-center justify-between p-5 border-b border-white/10">
                    <h2 className="text-xl font-semibold text-white">
                        {initialData ? 'Editar Script' : 'Novo Script'}
                    </h2>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-6">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Nome do Script *
                        </label>
                        <div className="flex items-center gap-3 bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-1 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="Ex: Backup Diário"
                                className="bg-transparent w-full py-2.5 outline-none text-white text-sm"
                            />
                        </div>
                        {errors.name && (
                            <p className="text-red-400 text-xs mt-1 px-1">{errors.name}</p>
                        )}
                    </div>

                    {/* Responsible */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400 flex items-center gap-2">
                            <User className="w-4 h-4" /> Responsável
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1" ref={respDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsRespOpen(!isRespOpen)}
                                    className={`flex items-center gap-3 bg-[#1a1a24] border border-white/10 w-full rounded-xl px-4 py-3 transition-all hover:bg-white/10 ${isRespOpen ? 'ring-2 ring-blue-500/50' : ''}`}
                                >
                                    <span className={`flex-1 text-left text-sm truncate ${activeResponsible ? 'text-white' : 'text-gray-500'}`}>
                                        {activeResponsible ? activeResponsible.name : 'Selecione um responsável'}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isRespOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isRespOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl animate-fadeIn max-h-[250px] overflow-y-auto">
                                        <div className="py-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleChange('responsible_id', null);
                                                    setIsRespOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/10 ${formData.responsible_id === null ? 'text-blue-400 bg-blue-500/10' : 'text-gray-300'}`}
                                            >
                                                Nenhum
                                            </button>
                                            {responsibles.map((r) => (
                                                <div
                                                    key={r.id}
                                                    className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-white/10 ${formData.responsible_id === r.id ? 'text-blue-400 bg-blue-500/10' : 'text-gray-300'}`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleChange('responsible_id', r.id);
                                                            setIsRespOpen(false);
                                                        }}
                                                        className="flex-1 text-left flex items-center gap-2"
                                                    >
                                                        {r.name}
                                                        {formData.responsible_id === r.id && <Check className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteResponsible(r.id, r.name);
                                                        }}
                                                        className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                                                        title="Excluir responsável"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Add Responsible Trigger */}
                            <button
                                type="button"
                                onClick={() => setIsAddingResponsible(!isAddingResponsible)}
                                className={`p-3 rounded-xl transition-all shadow-lg ${isAddingResponsible ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}
                                title={isAddingResponsible ? "Fechar" : "Novo Responsável"}
                            >
                                {isAddingResponsible ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Add Responsible Inline Form */}
                        {isAddingResponsible && (
                            <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-3 flex gap-2 animate-fadeIn shadow-xl">
                                <input
                                    type="text"
                                    autoFocus
                                    value={newResponsibleName}
                                    onChange={(e) => setNewResponsibleName(e.target.value)}
                                    placeholder="Nome do novo responsável..."
                                    className="bg-transparent flex-1 py-1.5 outline-none text-white text-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddResponsible();
                                        } else if (e.key === 'Escape') {
                                            setIsAddingResponsible(false);
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddResponsible}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                    Salvar
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Frequency */}
                    <div className={formData.frequency === 'custom' ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Frequência
                            </label>
                            <div className="relative" ref={freqDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsFreqOpen(!isFreqOpen)}
                                    className={`flex items-center gap-3 bg-[#1a1a24] border border-white/10 w-full rounded-xl px-4 py-3 transition-all hover:bg-white/10 ${isFreqOpen ? 'ring-2 ring-blue-500/50' : ''}`}
                                >
                                    <span className="flex-1 text-left text-white text-sm truncate">
                                        {activeFrequency.label}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isFreqOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isFreqOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl animate-fadeIn">
                                        <div className="py-1">
                                            {frequencyOptions.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => {
                                                        handleChange('frequency', opt.value);
                                                        setIsFreqOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/10 flex items-center justify-between ${formData.frequency === opt.value ? 'text-blue-400 bg-blue-500/10' : 'text-gray-300'}`}
                                                >
                                                    {opt.label}
                                                    {formData.frequency === opt.value && <Check className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Scheduled Times (Multiple times per day) */}
                        {formData.frequency === 'scheduled' && (
                            <div className="space-y-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl p-5 animate-fadeIn">
                                <label className="block text-sm font-medium text-purple-400 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Horários de Execução
                                </label>

                                <div className="flex gap-2">
                                    <input
                                        type="time"
                                        className="bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500/50 flex-1"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddTime(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleAddTime(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <div className="flex items-center text-[10px] text-gray-500 italic">
                                        Selecione os horários em que o robô deve rodar.
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 min-h-[40px]">
                                    {formData.scheduled_times ? formData.scheduled_times.split(',').map(time => (
                                        <div key={time} className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-1.5 text-purple-300 text-sm animate-fadeIn group">
                                            <span className="font-mono font-bold">{time}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTime(time)}
                                                className="hover:text-red-400 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="text-xs text-gray-600 py-2">Nenhum horário adicionado...</div>
                                    )}
                                </div>

                                <div className="pt-2 border-t border-white/5">
                                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-wider">Janela de Tolerância</label>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 text-xs text-gray-400">
                                            Quanto tempo o robô tem para rodar após cada horário?
                                        </div>
                                        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                                            <input
                                                type="number"
                                                value={formData.expected_interval || 60}
                                                onChange={(e) => handleChange('expected_interval', e.target.value)}
                                                className="bg-transparent w-12 text-center text-white text-sm outline-none"
                                            />
                                            <span className="text-gray-500 text-[10px]">min</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Interval (Only if Custom) */}
                        {formData.frequency === 'custom' && (
                            <div className="space-y-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5 animate-fadeIn">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-blue-400 flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Janela de Monitoramento
                                    </label>
                                    <span className="text-xs font-mono text-white/50 bg-black/40 px-2 py-1 rounded-lg">
                                        {formData.expected_interval || 0} minutos
                                    </span>
                                </div>

                                <div className="flex flex-col gap-4">
                                    {/* Duration Display and Manual Input */}
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleIncrement(-60)}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/5 transition-colors"
                                        >
                                            -1h
                                        </button>
                                        <div className="flex-1 text-center py-2 bg-black/30 rounded-xl border border-white/10">
                                            <span className="text-lg font-semibold text-white">
                                                {formatFullDuration(formData.expected_interval)}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleIncrement(60)}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 border border-white/5 transition-colors"
                                        >
                                            +1h
                                        </button>
                                    </div>

                                    {/* Quick Adjustments */}
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleIncrement(-15)}
                                            className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                        >
                                            -15m
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleIncrement(15)}
                                            className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                        >
                                            +15m
                                        </button>
                                        <div className="w-px h-4 bg-white/10 mx-1" />
                                        <button
                                            type="button"
                                            onClick={() => handleChange('expected_interval', 0)}
                                            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                                        >
                                            Zerar
                                        </button>
                                    </div>

                                    {/* Saved Presets */}
                                    <div className="space-y-2 pt-2 border-t border-white/5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Seus Atalhos</span>
                                            {formData.expected_interval > 0 && !presets.includes(Number(formData.expected_interval)) && (
                                                <button
                                                    type="button"
                                                    onClick={handleSavePreset}
                                                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                                >
                                                    <Plus className="w-2.5 h-2.5" /> Salvar este
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {presets.map((p) => (
                                                <div
                                                    key={p}
                                                    className={`group inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${Number(formData.expected_interval) === p
                                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                                        : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/30'
                                                        }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChange('expected_interval', p)}
                                                        className="text-xs font-medium"
                                                    >
                                                        {formatPresetLabel(p)}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePreset(p)}
                                                        className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-500 leading-relaxed italic">
                                    Dica: Se o robô roda das 09h às 10h, defina uma "Janela de 1h". O sistema verificará se houve execução nesse período.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Calculate Average Time */}
                    <div className="p-4 bg-[#1a1a24] border border-white/10 rounded-2xl hover:border-white/20 transition-all shadow-sm">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={formData.calculate_average_time}
                                    onChange={(e) => handleChange('calculate_average_time', e.target.checked)}
                                    className="sr-only"
                                />
                                <div className={`w-12 h-6 rounded-full transition-all duration-300 ${formData.calculate_average_time ? 'bg-blue-600' : 'bg-white/10'}`}></div>
                                <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-lg ${formData.calculate_average_time ? 'translate-x-6' : ''}`}></div>
                            </div>
                            <div className="flex-1">
                                <span className="block text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                    Calcular tempo médio
                                </span>
                                <span className="block text-xs text-gray-500 mt-0.5">
                                    Envia um <code className="bg-black/20 px-1 rounded text-blue-300 text-[10px]">start_time</code> automático no webhook.
                                </span>
                            </div>
                        </label>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">
                            Descrição
                        </label>
                        <div className="bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Descreva o que este script faz..."
                                rows={3}
                                className="bg-transparent w-full outline-none text-white text-sm resize-none py-1"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-6 sticky bottom-0 bg-[#12121a] pb-1 mt-6 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-gray-300 font-medium hover:bg-[#1a1a24] transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 py-3 text-sm shadow-xl shadow-blue-600/20"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            {initialData ? 'Salvar Alterações' : 'Criar Script'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
