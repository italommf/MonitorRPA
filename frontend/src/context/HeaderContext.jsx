import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const HeaderContext = createContext();

export function HeaderProvider({ children }) {
    const [headerState, setHeaderState] = useState({
        onRefresh: null,
        isRefreshing: false,
        actions: null,
    });

    const updateHeader = useCallback((newState) => {
        setHeaderState(prev => {
            // Check if we actually need to update to prevent unnecessary re-renders
            // Note: Deep comparison for JSX/functions is not practical here, 
            // but we can at least avoid triggering updates if the state is identical.

            const isDifferent = Object.keys(newState).some(key => prev[key] !== newState[key]);
            if (!isDifferent) return prev;

            return { ...prev, ...newState };
        });
    }, []);

    const value = useMemo(() => ({
        ...headerState,
        updateHeader
    }), [headerState, updateHeader]);

    return (
        <HeaderContext.Provider value={value}>
            {children}
        </HeaderContext.Provider>
    );
}

export function useHeader() {
    const context = useContext(HeaderContext);
    if (!context) {
        throw new Error('useHeader must be used within a HeaderProvider');
    }
    return context;
}
