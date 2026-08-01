import { useEffect } from 'react';
import AboutDialog from './components/AboutDialog';
import DeviceView from './components/DeviceView';
import Header from './components/Header';
import HelpDialog from './components/HelpDialog';
import MainView from './components/MainView';
import StatusBar from './components/StatusBar';
import {
  refreshAdapters,
  runDiscovery,
  seedDemoIfNeeded,
  seedDeviceWindowDemo,
} from './lib/actions';
import { wireEvents } from './lib/ipc';

// Enrutado por ventana (estilo Advatek): la ventana principal lista los
// controladores; cada ventana `?device=<ip>` es la configuración de ese
// controlador, con su propio contexto JS y suscripción de eventos filtrada.
const deviceIp = new URLSearchParams(window.location.search).get('device');

export default function App() {
  useEffect(() => {
    if (deviceIp) {
      void wireEvents(deviceIp);
      seedDeviceWindowDemo(deviceIp);
      return;
    }
    void wireEvents();
    void refreshAdapters();
    seedDemoIfNeeded();
    // Autodescubrir al abrir la app (los dispositivos aparecen sin pulsar Buscar).
    window.setTimeout(() => void runDiscovery(), 1500);
  }, []);

  if (deviceIp) {
    return (
      <div className="flex h-full flex-col">
        <DeviceView ip={deviceIp} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col">
        <MainView />
      </div>
      <StatusBar />
      <AboutDialog />
      <HelpDialog />
    </div>
  );
}
