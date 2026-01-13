import { useState, useRef, useEffect } from 'react';
import { Search, Filter, X, ChevronDown, LayoutGrid, List } from 'lucide-react';

const filterOptions = [
    { value: '', label: 'Todos' },
    { value: 'never_ran', label: 'Nunca rodou' },
    { value: 'ran_today', label: 'Rodou hoje' },
    { value: 'with_error', label: 'Com erro' },
    { value: 'delayed', label: 'Atrasado' },
];

export default function FilterBar({ search, filter, onSearchChange, onFilterChange, viewMode, onViewModeChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const activeOption = filterOptions.find(opt => opt.value === filter) || filterOptions[0];

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="flex flex-col lg:flex-row gap-4 mb-8 items-stretch lg:items-center">
            {/* Search */}
            <div className="flex-1 flex items-center gap-3 glass rounded-xl px-4 py-1 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                <Search className="w-5 h-5 text-gray-500 shrink-0" />
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Buscar por nome..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="bg-transparent w-full py-2.5 outline-none text-white text-sm"
                    />
                    {search && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    )}
                </div>
            </div>

            {/* View Mode Selector */}
            <div className="flex bg-black/20 p-1 rounded-xl glass border border-white/5">
                <button
                    onClick={() => onViewModeChange('grid')}
                    className={`p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${viewMode === 'grid'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                    title="Visualização em Grade"
                >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline">Grade</span>
                </button>
                <button
                    onClick={() => onViewModeChange('list')}
                    className={`p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${viewMode === 'list'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                    title="Visualização em Lista"
                >
                    <List className="w-4 h-4" />
                    <span className="hidden sm:inline">Lista</span>
                </button>
            </div>

            {/* Custom Filter Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-3 glass rounded-xl px-4 py-3 transition-all hover:bg-white/5 min-w-[180px] ${isOpen ? 'ring-2 ring-blue-500/50' : ''}`}
                >
                    <Filter className="w-5 h-5 text-gray-500 shrink-0" />
                    <span className="flex-1 text-left text-white text-sm truncate">
                        {activeOption.label}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 glass rounded-xl overflow-hidden shadow-2xl animate-fadeIn">
                        <div className="py-1">
                            {filterOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => {
                                        onFilterChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/10 ${filter === opt.value ? 'text-blue-400 bg-blue-500/5' : 'text-gray-300'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
