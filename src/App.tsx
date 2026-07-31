import { useEffect } from 'react';
import AboutDialog from './components/AboutDialog';
import DeviceView from './components/DeviceView';
import Header from './components/Header';
import HelpDialog from './components/HelpDialog';
import MainView from './components/MainView';
import StatusBar from './components/StatusBar';
import { refreshAdapters, runDiscovery, seedDemoIfNeeded } from './lib/actions';
import { wireEvents } from './lib/ipc';
import { useAppStore } from './store/appStore';

export default function App() {
  const view = useAppStore((s) => s.view);

  useEffect(() => {
    void wireEvents();
    void refreshAdapters();
    seedDemoIfNeeded();
    // Autodescubrir al abrir la app (los dispositivos aparecen sin pulsar Buscar).
    window.setTimeout(() => void runDiscovery(), 1500);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col">
        {view.kind === 'main' ? <MainView /> : <DeviceView ip={view.ip} />}
      </div>
      <StatusBar />
      <AboutDialog />
      <HelpDialog />
    </div>
  );
}
