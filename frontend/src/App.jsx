import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Scripts from './pages/Scripts';
import Systems from './pages/Systems';
import ScriptDetails from './pages/ScriptDetails';
import SystemDetails from './pages/SystemDetails';
import Background3D from './components/Background3D';
import PageTransition from './components/PageTransition';
import Header from './components/Header';
import { HeaderProvider, useHeader } from './context/HeaderContext';

function GlobalHeader() {
    const { onRefresh, isRefreshing, actions } = useHeader();
    return <Header onRefresh={onRefresh} isRefreshing={isRefreshing} actions={actions} />;
}

function AnimatedRoutes() {
    return (
        <PageTransition>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/scripts" element={<Scripts />} />
                <Route path="/scripts/:id" element={<ScriptDetails />} />
                <Route path="/systems" element={<Systems />} />
                <Route path="/systems/:id" element={<SystemDetails />} />
            </Routes>
        </PageTransition>
    );
}

export default function App() {
    return (
        <HeaderProvider>
            <BrowserRouter>
                <Background3D />
                <div className="main-layout">
                    <GlobalHeader />
                    <AnimatedRoutes />
                </div>
            </BrowserRouter>
        </HeaderProvider>
    );
}
