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
import { useAppStore } from './store/appStore';

// Enrutado por ventana (estilo Advatek): la ventana principal lista los
// controladores; cada ventana `?device=<ip>` es la configuración de ese
// controlador, con su propio contexto JS y suscripción de eventos filtrada.
const deviceIp = new URLSearchParams(window.location.search).get('device');

export default function App() {
  // Al cambiar el idioma se remonta el árbol completo (key={lang}) para que
  // todos los textos se relean del binding vivo `t`.
  const lang = useAppStore((s) => s.lang);

  useEffect(() => {
    // `?lang=es|en` fuerza el idioma (vista previa, capturas, enlaces).
    const langParam = new URLSearchParams(window.location.search).get('lang');
    if (langParam === 'es' || langParam === 'en') useAppStore.getState().setLang(langParam);

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
      <div key={lang} className="flex h-full flex-col">
        <DeviceView ip={deviceIp} />
      </div>
    );
  }

  return (
    <div key={lang} className="flex h-full flex-col">
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
