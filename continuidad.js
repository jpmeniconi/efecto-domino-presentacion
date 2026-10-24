// Una decisión, una prueba visual. Recortes temporales de grabaciones existentes.
(function () {
  'use strict';
  var lamina = document.getElementById('10');
  var telefono = document.getElementById('continuidad-telefono');
  if (!lamina || !telefono) return;
  var video = document.getElementById('continuidad-video');
  var poster = document.getElementById('continuidad-poster');
  var etiqueta = document.getElementById('continuidad-etiqueta');
  var control = document.getElementById('continuidad-reproducir');
  var botones = Array.from(lamina.querySelectorAll('[data-decision]'));
  var reducir = window.matchMedia('(prefers-reduced-motion: reduce)');
  var clips = {
    avisos: { src: 'demo-notificaciones.mp4', poster: 'notificacion-aviso.png', inicio: 6, fin: 9, titulo: 'Avisos por elección' },
    avance: { src: 'demo-tu-avance.mp4', poster: 'tu-avance.png', inicio: .35, fin: 3.4, titulo: 'El avance permanece' },
    invitar: { src: 'semana-recorrido.mp4', poster: 'semana-invitar.png', inicio: 0, fin: 3.2, titulo: 'Invitar por elección' }
  };
  // Al entrar, las tres decisiones se muestran una tras otra; tocar una detiene el recorrido.
  var orden = ['avisos', 'avance', 'invitar'];
  var recorriendo = false;
  var siguiente = null;
  var elegido = 'avisos';
  var visible = false;
  var estabaActiva = false;
  var terminado = false;
  var pendiente = false;
  var fallo = false;
  var imprimiendo = false;

  function enPantalla() {
    return visible && lamina.classList.contains('activa') &&
      (!document.documentElement.classList.contains('modo-deck') || lamina.classList.contains('actual'));
  }
  function activa() {
    return enPantalla() && !document.hidden && !imprimiendo;
  }
  function pintar() {
    control.textContent = fallo ? 'No disponible' : terminado ? 'Repetir' : !video.paused ? 'Pausar' : telefono.classList.contains('con-video') ? 'Continuar' : 'Ver';
    control.disabled = fallo;
  }
  function reproducir(desdeInicio) {
    if (fallo) return;
    if (video.readyState < 1) { pendiente = true; return; }
    pendiente = false;
    if (desdeInicio) { terminado = false; video.currentTime = clips[elegido].inicio; }
    var promesa = video.play();
    if (promesa && promesa.catch) promesa.catch(function () { pintar(); });
  }
  function cancelarSiguiente() { clearTimeout(siguiente); siguiente = null; }
  function programarSiguiente() {
    cancelarSiguiente();
    var proxima = orden[orden.indexOf(elegido) + 1];
    if (!proxima) { recorriendo = false; return; }
    siguiente = setTimeout(function () {
      siguiente = null;
      if (recorriendo && activa()) elegir(proxima, true);
    }, 600);
  }
  function elegir(clave, reproducirAhora) {
    cancelarSiguiente();
    pendiente = false;
    video.pause();
    elegido = clave;
    terminado = false;
    fallo = false;
    telefono.classList.remove('con-video');
    var clip = clips[clave];
    etiqueta.textContent = clip.titulo;
    poster.src = 'medios/' + clip.poster;
    poster.alt = clip.titulo + ', en la app de iPhone';
    botones.forEach(function (boton) {
      var elegidoAhora = boton.dataset.decision === clave;
      boton.setAttribute('aria-pressed', String(elegidoAhora));
      boton.closest('.decision').classList.toggle('seleccionada', elegidoAhora);
    });
    video.src = 'medios/' + clip.src;
    video.load();
    pintar();
    if (reproducirAhora) reproducir(true);
  }
  function sincronizar() {
    // Estas suspensiones pausan el clip sin convertir el regreso en otra entrada.
    if (document.hidden || imprimiendo) { pendiente = false; cancelarSiguiente(); video.pause(); return; }
    var ahora = enPantalla();
    if (ahora && !estabaActiva) { recorriendo = !reducir.matches; elegir('avisos', recorriendo); }
    else if (ahora && recorriendo && terminado && !siguiente) programarSiguiente();
    if (!ahora) { pendiente = false; recorriendo = false; cancelarSiguiente(); video.pause(); }
    estabaActiva = ahora;
  }
  botones.forEach(function (boton) {
    boton.addEventListener('click', function () { recorriendo = false; elegir(boton.dataset.decision, !reducir.matches); });
  });
  control.addEventListener('click', function () {
    cancelarSiguiente();
    if (!video.paused) video.pause();
    else reproducir(terminado || !telefono.classList.contains('con-video'));
  });
  botones.concat([control]).forEach(function (boton) {
    boton.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
    });
  });
  telefono.addEventListener('click', function (e) { e.stopPropagation(); });
  video.addEventListener('loadedmetadata', function () {
    video.currentTime = clips[elegido].inicio;
    if (pendiente && activa()) reproducir(false);
  });
  video.addEventListener('playing', function () {
    if (!activa()) { video.pause(); return; }
    telefono.classList.add('con-video');
    pintar();
  });
  video.addEventListener('pause', pintar);
  function finalizar() {
    terminado = true;
    video.pause();
    // timeupdate puede llegar después del corte: conserva la tarjeta de invitación,
    // sin alcanzar la siguiente escena del video ni volver a buscar un fotograma.
    if (elegido === 'invitar') telefono.classList.remove('con-video');
    pintar();
    if (recorriendo && activa()) programarSiguiente();
  }
  video.addEventListener('timeupdate', function () {
    if (!terminado && telefono.classList.contains('con-video') && video.currentTime >= clips[elegido].fin) {
      finalizar();
    }
  });
  video.addEventListener('ended', finalizar);
  video.addEventListener('error', function () {
    fallo = true; pendiente = false; telefono.classList.remove('con-video'); pintar();
    // Si un clip no carga, el recorrido sigue con la decisión siguiente.
    if (recorriendo && activa()) programarSiguiente();
  });
  new IntersectionObserver(function (entradas) {
    if (imprimiendo) return;
    visible = entradas[0].isIntersecting && entradas[0].intersectionRatio >= .2;
    sincronizar();
  }, { threshold: [0, .2] }).observe(telefono);
  new MutationObserver(sincronizar).observe(lamina, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(sincronizar).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sincronizar);
  function movimiento() { if (reducir.matches) { pendiente = false; recorriendo = false; cancelarSiguiente(); video.pause(); telefono.classList.remove('con-video'); pintar(); } }
  if (reducir.addEventListener) reducir.addEventListener('change', movimiento);
  else reducir.addListener(movimiento);
  window.addEventListener('beforeprint', function () { imprimiendo = true; sincronizar(); });
  window.addEventListener('afterprint', function () { imprimiendo = false; sincronizar(); });
})();
