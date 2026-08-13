import React, { createContext, useContext, useState, useEffect } from 'react';
import { DeviceMode } from '../types';

interface DeviceContextType {
  mode: DeviceMode;
  setMode: (mode: DeviceMode) => void;
  toggleMode: () => void;
  isPda: boolean;
  isDesktop: boolean;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auto detect screen width (< 768px -> PDA, >= 768px -> Desktop)
  const [mode, setMode] = useState<DeviceMode>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'pda' : 'desktop';
    }
    return 'desktop';
  });

  useEffect(() => {
    const handleResize = () => {
      setMode(window.innerWidth < 768 ? 'pda' : 'desktop');
    };

    // Initial check and event listener for screen resize
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSetMode = (newMode: DeviceMode) => {
    setMode(newMode);
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'desktop' ? 'pda' : 'desktop'));
  };

  return (
    <DeviceContext.Provider
      value={{
        mode,
        setMode: handleSetMode,
        toggleMode,
        isPda: mode === 'pda',
        isDesktop: mode === 'desktop',
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};
