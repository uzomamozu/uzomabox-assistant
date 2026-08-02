import { useEffect } from 'react';
import AboutDialog from './components/AboutDialog';
import DeviceTabBar from './components/DeviceTabBar';
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
import { isTauri, wireEvents } from './lib/ipc';
import { useAppStore } from './store/appStore';

// Enrutado por pestañas dentro de la ventana principal: la pestaña
// `devices` lista los controladores; cada controlador abierto es una pestaña
// con su configuración. Las vistas de dispositivo quedan montadas (ocultas)
// al cambiar de pestaña: conservan su estado y su conexión TCP.
// (Sustituye a las ventanas OS por dispositivo: crear un segundo WebView2
// en Windows dejaba la navegación colgada — ventana en blanco.)
const demoDeviceIp = !isTauri
  ? new URLSearchParams(window.location.search).get('device')
  : null;

export default function App() {
  // Al cambiar el idioma se remonta el árbol completo (key={lang}) para que
  // todos los textos se relean del binding vivo `t`.
  const lang = useAppStore((s) => s.lang);
  const openDevices = useAppStore((s) => s.openDevices);
  const activeView = useAppStore((s) => s.activeView);

  useEffect(() => {
    // `?lang=es|en` fuerza el idioma (vista previa, capturas, enlaces).
    const langParam = new URLSearchParams(window.location.search).get('lang');
    if (langParam === 'es' || langParam === 'en') useAppStore.getState().setLang(langParam);

    void wireEvents();
    void refreshAdapters();
    seedDemoIfNeeded();
    // Vista previa en navegador: `?device=<ip>` abre esa pestaña de demo.
    if (demoDeviceIp) {
      seedDeviceWindowDemo(demoDeviceIp);
      useAppStore.getState().openDevice(demoDeviceIp);
    }
    // Autodescubrir al abrir la app (los dispositivos aparecen sin pulsar Buscar).
    window.setTimeout(() => void runDiscovery(), 1500);
  }, []);

  return (
    <div key={lang} className="flex h-full flex-col">
      <Header />
      <DeviceTabBar />
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={activeView === 'devices' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
          <MainView />
        </div>
        {openDevices.map((ip) => (
          <div
            key={ip}
            className={activeView === ip ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
          >
            <DeviceView ip={ip} />
          </div>
        ))}
      </div>
      <StatusBar />
      <AboutDialog />
      <HelpDialog />
    </div>
  );
}
