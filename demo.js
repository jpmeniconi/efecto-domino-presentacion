// Lámina 7: la demo en video corre sola en el iPhone, un paso tras otro.
// Tocar un paso, o sus teclas 1–4, lo muestra y detiene el recorrido; K pausa o sigue.
(function () {
  'use strict';
  var telefono = document.getElementById('demo-telefono');
  if (!telefono) return;
  var lamina = telefono.closest('.diapositiva');
  var video = document.getElementById('demo-video');
  var poster = document.getElementById('demo-poster');
  var control = document.getElementById('demo-control');
  var textoControl = control.querySelector('.boton-video-texto');
  var barra = document.getElementById('demo-barra');
  var pasos = Array.from(lamina.querySelectorAll('[data-paso]'));
  var reducir = window.matchMedia('(prefers-reduced-motion: reduce)');
  var elegido = 0;
  var recorriendo = false;
  var siguiente = null;
  var visible = false;
  var estabaActiva = false;
  var terminado = false;
  var pendiente = false;
  var imprimiendo = false;
  var cuadro = 0;

  function enPantalla() {
    return visible && lamina.classList.contains('activa') &&
      (!document.documentElement.classList.contains('modo-deck') || lamina.classList.contains('actual'));
  }
  function activa() {
    return enPantalla() && !document.hidden && !imprimiendo;
  }
  function pintar() {
    var pausado = video.paused || terminado;
    control.setAttribute('data-estado', pausado ? 'pausado' : 'reproduciendo');
    textoControl.textContent = terminado ? 'Repetir' : pausado ? 'Reproducir' : 'Pausa';
  }
  function pintarProgreso() {
    var fraccion = video.duration ? video.currentTime / video.duration : 0;
    barra.style.transform = 'scaleX(' + Math.min(Math.max(fraccion, 0), 1) + ')';
    if (!video.paused && !video.ended) cuadro = requestAnimationFrame(pintarProgreso);
  }
  function cancelarSiguiente() { clearTimeout(siguiente); siguiente = null; }
  function programarSiguiente() {
    cancelarSiguiente();
    if (elegido + 1 >= pasos.length) { recorriendo = false; return; }
    siguiente = setTimeout(function () {
      siguiente = null;
      if (recorriendo && activa()) elegir(elegido + 1, true);
    }, 700);
  }
  function reproducir(desdeInicio) {
    if (video.readyState < 1) { pendiente = true; return; }
    pendiente = false;
    if (desdeInicio) { terminado = false; video.currentTime = 0; }
    var promesa = video.play();
    if (promesa && promesa.catch) promesa.catch(function () { pintar(); });
  }
  function elegir(indice, reproducirAhora) {
    cancelarSiguiente();
    pendiente = false;
    video.pause();
    cancelAnimationFrame(cuadro);
    elegido = indice;
    terminado = false;
    var paso = pasos[indice];
    pasos.forEach(function (boton, i) { boton.setAttribute('aria-current', i === indice ? 'true' : 'false'); });
    telefono.classList.remove('con-video');
    poster.src = 'medios/' + paso.getAttribute('data-captura');
    poster.alt = paso.querySelector('.clip-nombre').textContent + ', en la app de iPhone';
    barra.style.transform = 'scaleX(0)';
    video.src = 'medios/' + paso.getAttribute('data-video');
    video.load();
    pintar();
    if (reproducirAhora) reproducir(true);
  }
  function alternar() {
    cancelarSiguiente();
    if (!video.paused) video.pause();
    else reproducir(terminado || !telefono.classList.contains('con-video'));
  }
  function finalizar() {
    terminado = true;
    video.pause();
    pintar();
    if (recorriendo && activa()) programarSiguiente();
  }
  function sincronizar() {
    // Cambiar de pestaña o imprimir pausa el paso sin convertir el regreso en otra entrada.
    if (document.hidden || imprimiendo) { pendiente = false; cancelarSiguiente(); video.pause(); return; }
    var ahora = enPantalla();
    if (ahora && !estabaActiva) { recorriendo = !reducir.matches; elegir(0, recorriendo); }
    else if (ahora && recorriendo && terminado && !siguiente) programarSiguiente();
    if (!ahora) { pendiente = false; recorriendo = false; cancelarSiguiente(); video.pause(); }
    estabaActiva = ahora;
  }

  pasos.forEach(function (boton, i) {
    boton.addEventListener('click', function (e) {
      e.stopPropagation();
      recorriendo = false;
      elegir(i, !reducir.matches);
    });
  });
  control.addEventListener('click', function (e) { e.stopPropagation(); alternar(); });
  telefono.addEventListener('click', function (e) { e.stopPropagation(); alternar(); });
  pasos.concat([control]).forEach(function (boton) {
    boton.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') e.stopPropagation();
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || !enPantalla()) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (/^[1-4]$/.test(e.key) && pasos[Number(e.key) - 1]) {
      e.preventDefault();
      recorriendo = false;
      elegir(Number(e.key) - 1, true);
    } else if (e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      alternar();
    }
  });

  video.addEventListener('loadedmetadata', function () {
    if (pendiente && activa()) reproducir(true);
  });
  video.addEventListener('playing', function () {
    if (!activa()) { video.pause(); return; }
    telefono.classList.add('con-video');
    pintar();
    cancelAnimationFrame(cuadro);
    cuadro = requestAnimationFrame(pintarProgreso);
  });
  video.addEventListener('pause', function () { cancelAnimationFrame(cuadro); pintar(); });
  video.addEventListener('ended', function () { pintarProgreso(); finalizar(); });
  video.addEventListener('error', function () {
    // Sin video queda la captura del paso, y el recorrido sigue con el siguiente.
    pendiente = false;
    telefono.classList.remove('con-video');
    pintar();
    if (recorriendo && activa()) programarSiguiente();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entradas) {
      if (imprimiendo) return;
      visible = entradas[0].isIntersecting && entradas[0].intersectionRatio >= .2;
      sincronizar();
    }, { threshold: [0, .2] }).observe(telefono);
  } else {
    visible = true;
  }
  new MutationObserver(sincronizar).observe(lamina, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(sincronizar).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sincronizar);
  function movimiento() {
    if (!reducir.matches) return;
    pendiente = false; recorriendo = false; cancelarSiguiente(); video.pause();
    telefono.classList.remove('con-video');
    pintar();
  }
  if (reducir.addEventListener) reducir.addEventListener('change', movimiento);
  else reducir.addListener(movimiento);
  window.addEventListener('beforeprint', function () { imprimiendo = true; sincronizar(); });
  window.addEventListener('afterprint', function () { imprimiendo = false; sincronizar(); });

  // Las capturas de cada paso se cargan de antemano para que aparezcan al tiro.
  window.addEventListener('load', function () {
    pasos.forEach(function (boton) { new Image().src = 'medios/' + boton.getAttribute('data-captura'); });
  });
})();
