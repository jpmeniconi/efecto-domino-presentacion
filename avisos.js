(function () {
  'use strict';
  var lamina = document.getElementById('12');
  if (!lamina) return;
  // Copys de PlanDeAvisos.swift con fechas y cantidades de ejemplo. Son momentos distintos.
  var ejemplos = [
    { fecha:'Lunes 19 de octubre', hora:'19:00', contexto:'Antes del bloque', titulo:'Tu próximo bloque', texto:'Gimnasio, 45 min · lunes 19 a las 19:30. Puedes dejar lo que necesitas a mano.' },
    { fecha:'Miércoles 21 de octubre', hora:'20:10', contexto:'Después de la sesión', titulo:'¿Quieres registrar este bloque?', texto:'Caminata · miércoles 21 a las 19:30. Si fuiste, puedes guardar cómo lo pasaste.' },
    { fecha:'Viernes 23 de octubre', hora:'20:30', contexto:'Después de guardar su avance', titulo:'Una ficha más en tu muro', texto:'Ya tienes 8 fichas en pie. El bloque que registraste queda en tu avance.' },
    { fecha:'Domingo 25 de octubre', hora:'18:00', contexto:'Antes de una nueva semana', titulo:'Tu próxima semana', texto:'Tienes 4 bloques en tu plan. Puedes revisar los horarios y dejarla lista.' }
  ];
  var botones = Array.from(lamina.querySelectorAll('[data-aviso]'));
  var recorrer = document.getElementById('avisos-recorrer');
  var banner = document.getElementById('aviso-banner');
  var video = document.getElementById('video-avisos');
  var grabacion = document.getElementById('aviso-grabacion');
  var abrirVideo = document.getElementById('avisos-reproducir');
  var cerrarVideo = document.getElementById('avisos-cerrar-video');
  var reducir = window.matchMedia('(prefers-reduced-motion: reduce)');
  var indice = 0, temporizador = null, visible = false, andando = false, imprimiendo = false, eleccionManual = false;
  function pintarControl() { recorrer.textContent=andando?'Pausar recorrido':indice===3?'Repetir recorrido':'Ver recorrido'; }
  function parar() { clearTimeout(temporizador); temporizador=null; andando=false; pintarControl(); }
  function pintar(n) {
    indice=n; var dato=ejemplos[n];
    document.getElementById('aviso-fecha').textContent=dato.fecha;
    document.getElementById('aviso-hora').textContent=dato.hora;
    document.getElementById('aviso-contexto').textContent=dato.contexto;
    document.getElementById('aviso-titulo').textContent=dato.titulo;
    document.getElementById('aviso-cuerpo').textContent=dato.texto;
    botones.forEach(function(b,i){ b.classList.toggle('elegido',i===n); b.setAttribute('aria-pressed',String(i===n)); });
    banner.classList.remove('entrando'); void banner.offsetWidth; banner.classList.add('entrando');
    pintarControl();
  }
  function programar() {
    temporizador=setTimeout(function(){
      if (!andando || document.hidden || imprimiendo) { parar(); return; }
      if (!visible) { temporizador=null; return; }
      if (indice===3) { parar(); return; }
      pintar(indice+1); programar();
    },3300);
  }
  function iniciar() { parar(); pintar(0); andando=true; pintarControl(); programar(); }
  function ocultarVideo() { video.pause(); grabacion.hidden=true; abrirVideo.setAttribute('aria-expanded','false'); }
  botones.forEach(function(b){ b.addEventListener('click',function(e){ e.stopPropagation(); eleccionManual=true; parar(); ocultarVideo(); pintar(Number(b.dataset.aviso)); }); });
  recorrer.addEventListener('click',function(e){ e.stopPropagation(); eleccionManual=true; ocultarVideo(); if(andando) parar(); else iniciar(); });
  abrirVideo.addEventListener('click',function(e){
    e.stopPropagation(); eleccionManual=true; parar(); grabacion.hidden=false; abrirVideo.setAttribute('aria-expanded','true'); video.currentTime=0;
    var p=video.play(); if(p) p.catch(function(){ document.getElementById('aviso-estado').textContent='Usa los controles para reproducir la grabación.'; });
  });
  cerrarVideo.addEventListener('click',function(e){ e.stopPropagation(); ocultarVideo(); document.getElementById('aviso-estado').textContent='Ejemplos de avisos en distintos momentos.'; });
  lamina.querySelectorAll('button,a,video').forEach(function(el){
    el.addEventListener('keydown',function(e){ if(e.key===' '||e.key==='Enter') e.stopPropagation(); });
    el.addEventListener('click',function(e){ e.stopPropagation(); });
  });
  function ver(nueva) {
    if(nueva===visible) return; visible=nueva;
    if(visible) {
      // Desplazarse hasta el teléfono no debe sustituir un ejemplo ya elegido.
      if(eleccionManual) { if(andando && temporizador===null) programar(); return; }
      ocultarVideo(); pintar(0); if(!reducir.matches && !document.hidden && !imprimiendo) iniciar(); else parar();
    }
    else { parar(); ocultarVideo(); }
  }
  function verificarDeck(){ if(document.documentElement.classList.contains('modo-deck')) ver(lamina.classList.contains('actual')); }
  new MutationObserver(verificarDeck).observe(lamina,{attributes:true,attributeFilter:['class']});
  new MutationObserver(verificarDeck).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  // En vertical, esperar a que el teléfono sea visible, no solo el título de la lámina.
  if('IntersectionObserver' in window) new IntersectionObserver(function(entries){ if(!document.documentElement.classList.contains('modo-deck')) ver(entries[0].isIntersecting && entries[0].intersectionRatio >= .35); },{threshold:[0,.35]}).observe(lamina.querySelector('.avisos-telefono'));
  document.addEventListener('visibilitychange',function(){ if(document.hidden){parar();video.pause();} });
  reducir.addEventListener('change',function(){if(reducir.matches) parar();});
  video.addEventListener('playing',function(){if(grabacion.hidden || document.hidden || imprimiendo) video.pause();});
  window.addEventListener('beforeprint',function(){imprimiendo=true;parar();ocultarVideo();});
  window.addEventListener('afterprint',function(){imprimiendo=false;});
  video.addEventListener('error',function(){ocultarVideo();document.getElementById('aviso-estado').textContent='La grabación no está disponible. Puedes recorrer los cuatro ejemplos.';});
  pintar(0); parar(); verificarDeck();
})();
