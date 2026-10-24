// Lámina final: tarjetas que avanzan, se desenfocan y dan paso a la frase del cierre.
// La frase aparece con la flecha (o un clic) o sola a los 9 s; al final se arma el logo.
(function () {
  'use strict';
  var lamina = document.getElementById('12');
  if (!lamina) return;
  var frase = lamina.querySelector('.final-frase');
  var firma = lamina.querySelector('.final-firma');
  var raiz = document.documentElement;
  var reducir = window.matchMedia('(prefers-reduced-motion: reduce)');
  var sola = null;
  var armar = null;
  var estabaActiva = false;
  var visible = false;
  var imprimiendo = false;

  // Cada palabra entra por separado; el texto completo queda en aria-label para lectores de pantalla.
  var indice = 0;
  function partir(nodo, acento) {
    Array.from(nodo.childNodes).forEach(function (hijo) {
      if (hijo.nodeType === Node.TEXT_NODE) {
        var piezas = hijo.textContent.split(/(\s+)/);
        var fragmento = document.createDocumentFragment();
        piezas.forEach(function (pieza) {
          if (!pieza) return;
          if (/^\s+$/.test(pieza)) { fragmento.appendChild(document.createTextNode(' ')); return; }
          var palabra = document.createElement('span');
          palabra.className = 'final-palabra' + (acento ? ' final-acento' : '');
          palabra.style.setProperty('--p', indice++);
          palabra.setAttribute('aria-hidden', 'true');
          palabra.textContent = pieza;
          fragmento.appendChild(palabra);
        });
        nodo.replaceChild(fragmento, hijo);
      } else if (hijo.nodeType === Node.ELEMENT_NODE) {
        partir(hijo, acento || hijo.classList.contains('final-resalte'));
      }
    });
  }
  frase.setAttribute('aria-label', frase.textContent.replace(/\s+/g, ' ').trim());
  partir(frase, false);
  lamina.style.setProperty('--palabras', indice);

  // El logo es una copia del de la portada, con su propio reloj para armarse al final.
  var logo = null;
  var portada = document.getElementById('portada-logo');
  if (portada && typeof portada.pauseAnimations === 'function') {
    logo = portada.cloneNode(true);
    logo.removeAttribute('id');
    logo.setAttribute('class', 'final-logo');
    logo.innerHTML = logo.innerHTML.replace(/logo-naranja/g, 'final-naranja');
    firma.insertBefore(logo, firma.firstChild);
    logo.pauseAnimations();
    logo.setCurrentTime(0);
  }

  function enPantalla() {
    return visible && lamina.classList.contains('activa') &&
      (!raiz.classList.contains('modo-deck') || lamina.classList.contains('actual'));
  }
  function limpiar() { clearTimeout(sola); clearTimeout(armar); sola = armar = null; }
  function mostrarFrase() {
    limpiar();
    lamina.dataset.fase = 'frase';
    if (!logo) return;
    logo.pauseAnimations();
    logo.setCurrentTime(0);
    if (reducir.matches) return;
    // El logo se arma cuando ya entró la última palabra.
    armar = setTimeout(function () { logo.setCurrentTime(0); logo.unpauseAnimations(); }, 450 + indice * 75 + 500);
  }
  function sincronizar() {
    if (document.hidden || imprimiendo) { clearTimeout(sola); sola = null; return; }
    var ahora = enPantalla();
    if (ahora && !estabaActiva) {
      if (reducir.matches) mostrarFrase();
      else {
        limpiar();
        if (logo) { logo.pauseAnimations(); logo.setCurrentTime(0); }
        lamina.dataset.fase = 'tarjetas';
        sola = setTimeout(mostrarFrase, raiz.classList.contains('modo-deck') ? 9000 : 2200);
      }
    } else if (ahora && lamina.dataset.fase === 'tarjetas' && !sola) {
      sola = setTimeout(mostrarFrase, 4000);
    }
    if (!ahora) { limpiar(); if (!enPantalla()) lamina.dataset.fase = ''; }
    estabaActiva = ahora;
  }

  // La flecha o un clic muestran la frase antes de avanzar.
  lamina.addEventListener('avanzar', function (e) {
    if (lamina.dataset.fase === 'frase') return;
    e.preventDefault();
    mostrarFrase();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entradas) {
      if (imprimiendo) return;
      visible = entradas[0].isIntersecting && entradas[0].intersectionRatio >= .3;
      sincronizar();
    }, { threshold: [0, .3] }).observe(lamina);
  } else {
    visible = true;
  }
  new MutationObserver(sincronizar).observe(lamina, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(sincronizar).observe(raiz, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sincronizar);
  window.addEventListener('beforeprint', function () { imprimiendo = true; limpiar(); lamina.dataset.fase = 'frase'; });
  window.addEventListener('afterprint', function () { imprimiendo = false; estabaActiva = false; sincronizar(); });
})();
