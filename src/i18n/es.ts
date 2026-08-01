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
    close: 'Cerrar',
    tabs: {
      general: 'General',
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
    identifyHint: 'Hace parpadear el LED de la placa para localizar físicamente el dispositivo.',
    consoleTitle: 'Consola TX/RX',
    clear: 'Limpiar',
    noData: 'Esperando el primer volcado STATUS…',
    consoleEmpty: 'Sin actividad todavía.',
  },

  placeholder: {
    badge: 'M3',
    text: (tab: string) => `La configuración de «${tab}» estará disponible en M3.`,
  },

  shared: {
    apply: 'Aplicar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    notConnected: 'Sin conexión con el dispositivo. Los controles se habilitarán al reconectar.',
    rebooting: 'Reiniciando el dispositivo, reconectando…',
    rebootWarn: 'El dispositivo se reiniciará al aplicar este cambio y la conexión se restablecerá automáticamente.',
  },

  general: {
    nickname: 'Nickname',
    network: 'Red',
    staticIp: 'IP estática',
    mac: 'Dirección MAC',
    macPlaceholder: 'AA:BB:CC:DD:EE:FF',
    macBlindNote: 'El firmware v1 no expone la MAC actual; se escribe a ciegas.',
    info: 'Información del dispositivo',
    model: 'Modelo',
    firmware: 'Firmware',
    outputs: 'Salidas',
    maintenance: 'Mantenimiento',
    restart: 'Reiniciar dispositivo',
    restartNote:
      'El protocolo v1 no tiene comando REBOOT: esto reenvía CONFIG:record_fps con su valor actual, que fuerza el reinicio.',
    confirmIpTitle: 'Cambiar IP estática',
    confirmIpBody:
      'El dispositivo se reiniciará al aplicar la nueva IP y la conexión se interrumpirá unos segundos; la app reconectará automáticamente.',
    confirmMacTitle: 'Escribir dirección MAC',
    confirmMacBody:
      'El dispositivo se reiniciará al aplicar la nueva MAC y la conexión se interrumpirá unos segundos; la app reconectará automáticamente.',
    confirmRestartTitle: 'Reiniciar el dispositivo',
    confirmRestartBody:
      'La conexión se interrumpirá unos segundos y se restablecerá automáticamente. ¿Continuar?',
    invalidIp: 'Introduzca una IPv4 válida (p. ej. 192.168.1.50)',
    invalidMac: 'Formato esperado: AA:BB:CC:DD:EE:FF',
  },

  leds: {
    strip: 'Tira de LEDs',
    width: 'LEDs por tira',
    widthHint: 'Rango válido: 1–1020 (170 px por universo × 6 universos).',
    widthInvalid: 'Introduzca un entero entre 1 y 1020',
    colorOrder: 'Orden de color',
    confirmWidthTitle: 'Cambiar LEDs por tira',
    confirmWidthBody:
      'El dispositivo se reiniciará al aplicar este cambio y la conexión se interrumpirá unos segundos; la app reconectará automáticamente.',
    outputMap: 'Mapa de salidas',
    colOutput: 'Salida',
    colActive: 'Activa',
    colStart: 'Universo inicial',
    colEnd: 'Universo final',
    colEndChannel: 'Canal final',
    colSubnet: 'Subnet:Univ',
    startInvalid: '0–255',
    universePending:
      'El mapa de universos se ha guardado pero es inerte hasta reiniciar el dispositivo.',
    restartNow: 'Reiniciar ahora',
    confirmRestartTitle: 'Reiniciar el dispositivo',
    confirmRestartBody: 'Se aplicará el nuevo mapa de universos. La conexión se restablecerá automáticamente. ¿Continuar?',
  },

  artnet: {
    title: 'Modo ArtNet',
    activate: 'Activar modo ArtNet',
    active: 'Modo ArtNet activo',
    currentMode: (mode: string) => `Modo actual: ${mode}`,
    receiving: 'Recibiendo ArtNet',
    idle: 'Sin actividad ArtNet',
    fpsLabel: 'fps ArtNet',
  },

  test: {
    pattern: 'Patrón de test',
    patterns: ['Ciclo RGBW', 'Fade arcoíris', 'Rojo', 'Verde', 'Azul'],
    output: 'Salida',
    outputAll: 'Todas',
    outputN: (n: number) => `Salida ${n}`,
    start: 'Iniciar test',
    stop: 'Detener test',
    runningNote: 'Test en ejecución: la salida ArtNet está detenida.',
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
