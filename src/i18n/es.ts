/**
 * Cadenas de UI en español (idioma por defecto). La forma de este objeto
 * define el tipo `Strings`, que también cumple `en.ts`.
 */

export const APP_VERSION = '1.1.0';

export const t = {
  appName: 'UzomaBox Assistant',

  header: {
    help: 'Ayuda',
    about: 'Acerca de',
    langLabel: 'Idioma',
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

  tabs: {
    devices: 'Controladores',
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
    stalledHint:
      'Sin respuesta del dispositivo. Si ya tenía una sesión abierta de antes (el firmware v1 solo admite un cliente), reinícialo para liberarla.',
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

  playback: {
    activate: 'Activar modo Playback',
    active: 'Modo Playback activo',
    autostartHint: 'El firmware v1 inicia la secuencia completa automáticamente al entrar en modo Playback.',
    files: 'Archivos',
    refresh: 'Actualizar',
    loading: 'Cargando…',
    empty: 'Sin archivos grabados.',
    play: 'Reproducir',
    delete: 'Eliminar',
    confirmDeleteTitle: 'Eliminar archivo',
    confirmDeleteBody: (file: string) => `Se eliminará «${file}» del dispositivo. ¿Continuar?`,
    playAll: 'Reproducir todo',
    playAllHint: 'No disponible en firmware v1 (PLAY:SEQUENCE está roto en el firmware); llega en protocolo v2.',
    speed: 'Velocidad',
    progress: 'Progreso',
    stop: 'Detener',
    nowPlaying: (file: string) => `Reproduciendo: ${file}`,
    nothingPlaying: 'Nada en reproducción.',
    listError: (err: string) => `No se pudo obtener la lista: ${err}`,
  },

  grabacion: {
    activate: 'Activar modo Grabación',
    active: 'Modo Grabación activo',
    state: 'Estado',
    recording: 'Grabando',
    idle: 'En espera',
    elapsed: 'Tiempo',
    currentFile: 'Archivo actual',
    controls: 'Controles',
    start: 'Iniciar',
    stop: 'Detener',
    arm: 'Armar',
    fps: 'FPS de grabación',
    fpsInvalid: 'Introduzca un entero entre 5 y 60',
    confirmFpsTitle: 'Cambiar FPS de grabación',
    confirmFpsBody:
      'El dispositivo se reiniciará al aplicar este cambio y la conexión se interrumpirá unos segundos; la app reconectará automáticamente.',
    startTrigger: 'Trigger de inicio',
    startModes: ['Inmediato', 'Primer frame no-cero', 'Cambio de canal'],
    universe: 'Universo',
    channel: 'Canal',
    stopTrigger: 'Trigger de stop',
    stopModes: ['Manual', 'Todo en cero', 'Temporizador'],
    seconds: 'Segundos',
    volatileHint: 'Los parámetros de trigger son volátiles en v1 (no se guardan en el dispositivo).',
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
    patternsV2: ['Chase diagnóstico (1 píxel)', 'Blanco 10 % (carga)'],
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
      'Doble clic (o clic derecho → «Abrir configuración») sobre un controlador para abrir su ventana de configuración.',
      'En la pestaña «Estado» encontrará el estado en vivo y la consola TX/RX del protocolo.',
      'El idioma (ES/EN) se cambia desde el selector de la barra superior y se guarda automáticamente.',
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
};

/** Forma del catálogo de cadenas: la cumplen es y en. */
export type Strings = typeof t;
