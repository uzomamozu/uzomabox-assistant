/**
 * Cadenas de UI en español (M1). M2 añadirá EN y un selector de idioma;
 * por eso todas las cadenas viven en este módulo.
 */

export const APP_VERSION = '1.0.0';

export const t = {
  appName: 'UzomaBox Assistant',

  header: {
    help: 'Ayuda',
    about: 'Acerca de',
    themeLabel: 'Tema',
  },

  toolbar: {
    search: 'Buscar controladores',
    searching: 'Buscando…',
    adapter: 'Adaptador:',
    noAdapters: 'Sin adaptadores de red',
    refresh: 'Actualizar adaptadores',
    manualPlaceholder: 'Agregar por IP…',
    add: 'Agregar',
  },

  table: {
    model: 'Modelo',
    nick: 'Nickname',
    ip: 'IP',
    fw: 'Firmware',
    temp: 'Temp',
    unknown: '—',
    empty: 'Sin controladores. Pulse «Buscar controladores» para descubrir dispositivos en la red.',
  },

  menu: {
    open: 'Abrir configuración',
    identify: 'Identificar',
    remove: 'Quitar de la lista',
  },

  statusbar: {
    ready: 'Listo',
    devices: (n: number) => (n === 1 ? '1 controlador' : `${n} controladores`),
    version: (v: string) => `v${v}`,
  },

  device: {
    back: 'Volver',
    tabs: {
      red: 'Red',
      leds: 'LEDs',
      artnet: 'ArtNet',
      playback: 'Playback',
      grabacion: 'Grabación',
      test: 'Test',
      estado: 'Estado',
    },
    conn: {
      disconnected: 'Desconectado',
      connecting: 'Conectando…',
      connected: 'Conectado',
      lost: 'Conexión perdida',
    },
    latency: (ms: number) => `${ms} ms`,
  },

  estado: {
    title: 'Estado del dispositivo',
    identify: 'Identificar',
    consoleTitle: 'Consola TX/RX',
    clear: 'Limpiar',
    noData: 'Esperando el primer volcado STATUS…',
    consoleEmpty: 'Sin actividad todavía.',
  },

  placeholder: {
    badge: 'M2/M3',
    text: (tab: string) => `La configuración de «${tab}» estará disponible en M2/M3.`,
  },

  about: {
    title: 'Acerca de',
    description:
      'Herramienta de descubrimiento y configuración para controladores LED Art-Net UzomaBox (Teensy 4.1).',
    close: 'Cerrar',
  },

  help: {
    title: 'Ayuda',
    items: [
      'Pulse «Buscar controladores» para descubrir dispositivos UzomaBox en la red seleccionada.',
      'Doble clic (o clic derecho → «Abrir configuración») sobre un controlador para abrir su vista de configuración.',
      'En la pestaña «Estado» encontrará el estado en vivo y la consola TX/RX del protocolo.',
      'El tema de color se cambia desde los selectores de la barra superior y se guarda automáticamente.',
    ],
    close: 'Cerrar',
  },

  messages: {
    identifySent: (ip: string) => `IDENTIFY enviado a ${ip}`,
    identifyFailed: (ip: string, err: string) => `No se pudo identificar ${ip}: ${err}`,
    adaptersFailed: (err: string) => `Error al enumerar adaptadores: ${err}`,
    invalidIp: (ip: string) => `IP no válida: ${ip}`,
    selectAdapter: 'Seleccione un adaptador de red primero',
    searchingFrom: (ip: string) => `Buscando desde ${ip}…`,
  },
} as const;
