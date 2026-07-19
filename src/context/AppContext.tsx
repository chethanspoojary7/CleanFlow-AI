/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { DatasetInfo, HistoryState } from '../types';
import { getInfo } from '../services/api';

interface AppContextType {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  sessionId: string | null;
  datasetName: string | null;
  datasetInfo: DatasetInfo | null;
  activeModule: string;
  history: HistoryState[];
  canUndo: boolean;
  canRedo: boolean;
  codePanelOpen: boolean;
  sidebarOpen: boolean;
  rightSidebarOpen: boolean;
  generatedCode: string;
  setSessionId: (id: string | null) => void;
  setDatasetName: (name: string | null) => void;
  setDatasetInfo: (info: DatasetInfo | null) => void;
  setActiveModule: (module: string) => void;
  setHistory: (history: HistoryState[]) => void;
  setCanUndo: (v: boolean) => void;
  setCanRedo: (v: boolean) => void;
  setCodePanelOpen: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  setRightSidebarOpen: (v: boolean) => void;
  setGeneratedCode: (code: string) => void;
  refreshDatasetInfo: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'cleanflow-theme';

const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark';

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  return 'light';
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState<string | null>(null);
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [codePanelOpen, setCodePanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [generatedCode, setGeneratedCode] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', theme === 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const refreshDatasetInfo = useCallback(async () => {
    if (!sessionId) return;
    try {
      const info = await getInfo(sessionId);
      setDatasetInfo(info);
      if (info.can_undo !== undefined) setCanUndo(info.can_undo);
      if (info.can_redo !== undefined) setCanRedo(info.can_redo);
    } catch {
      // ignore
    }
  }, [sessionId]);

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        sessionId,
        datasetName,
        datasetInfo,
        activeModule,
        history,
        canUndo,
        canRedo,
        codePanelOpen,
        sidebarOpen,
        rightSidebarOpen,
        generatedCode,
        setSessionId,
        setDatasetName,
        setDatasetInfo,
        setActiveModule,
        setHistory,
        setCanUndo,
        setCanRedo,
        setCodePanelOpen,
        setSidebarOpen,
        setRightSidebarOpen,
        setGeneratedCode,
        refreshDatasetInfo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be within AppProvider');
  return ctx;
};
