import React, { useState, useRef } from 'react';
import { DeviceProvider, useDevice } from './context/DeviceContext';
import { ThemeProvider } from './context/ThemeContext';
import { DesktopLayout } from './layouts/DesktopLayout';
import { PDALayout } from './layouts/PDALayout';
import { ScanModule } from './components/ScanModule';
import { EncasilladoModule } from './components/EncasilladoModule';
import { NominacionDespachoModule } from './components/NominacionDespachoModule';
import { HomeModule } from './components/HomeModule';
import { LoginModule } from './components/LoginModule';
import { ConfiguracionModule } from './components/ConfiguracionModule';
import { ActiveModule } from './types';

const MainApp: React.FC = () => {
  const { isPda } = useDevice();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [operator, setOperator] = useState({
    name: 'Carlos Mendoza',
    rut: '18.492.105-K',
    id: 'OP-4921',
  });
  const [activeModule, setActiveModule] = useState<ActiveModule>('home');
  const backHandlerRef = useRef<(() => void) | null>(null);

  const handleRegisterBackHandler = (handler: (() => void) | null) => {
    backHandlerRef.current = handler;
  };

  const handleLoginSuccess = (opData: { name: string; rut: string; id: string }) => {
    setOperator(opData);
    setIsAuthenticated(true);
    setActiveModule('home'); // Redirige directamente al menú principal al ingresar
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveModule('home');
  };

  const handleGlobalBack = () => {
    if (backHandlerRef.current) {
      backHandlerRef.current();
    } else {
      setActiveModule('home');
    }
  };

  // Si no está autenticado, renderizar el Inicio de Sesión POR FUERA de la plataforma
  if (!isAuthenticated) {
    if (isPda) {
      return (
        <div className="w-full h-full min-h-[100dvh] md:min-h-screen bg-[#FAFDFC] md:bg-[#F3F6FA] text-[#414745] flex items-center justify-center p-0 md:p-4 select-none font-sans overflow-hidden">
          <div className="w-full h-[100dvh] md:max-w-[440px] md:h-[840px] bg-[#FAFDFC] border-0 md:border-8 md:border-slate-800 rounded-none md:rounded-[36px] shadow-none md:shadow-2xl flex flex-col overflow-hidden relative">
            <LoginModule onLoginSuccess={handleLoginSuccess} isPda={true} />
          </div>
        </div>
      );
    }
    return <LoginModule onLoginSuccess={handleLoginSuccess} isPda={false} />;
  }

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'home':
        return <HomeModule onSelectModule={setActiveModule} />;
      case 'encasillado':
        return <EncasilladoModule />;
      case 'nominacion':
        return (
          <NominacionDespachoModule
            onRegisterBackHandler={handleRegisterBackHandler}
            onBackHome={() => setActiveModule('home')}
          />
        );
      case 'escaneo':
        return <ScanModule />;
      case 'configuracion':
        return (
          <ConfiguracionModule
            operatorName={operator.name}
            operatorRut={operator.rut}
            operatorId={operator.id}
          />
        );
      default:
        return <HomeModule onSelectModule={setActiveModule} />;
    }
  };

  if (isPda) {
    return (
      <PDALayout
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        onBack={handleGlobalBack}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        operatorName={operator.name}
        operatorRut={operator.rut}
        operatorId={operator.id}
      >
        {renderModuleContent()}
      </PDALayout>
    );
  }

  return (
    <DesktopLayout
      activeModule={activeModule}
      onSelectModule={setActiveModule}
      isAuthenticated={isAuthenticated}
      onLogout={handleLogout}
      operatorName={operator.name}
      operatorRut={operator.rut}
      operatorId={operator.id}
    >
      {renderModuleContent()}
    </DesktopLayout>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <DeviceProvider>
        <MainApp />
      </DeviceProvider>
    </ThemeProvider>
  );
}

export default App;
