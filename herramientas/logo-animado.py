#!/usr/bin/env python3
"""Logo animado de Dominó: genera medios/logo-animado.svg y su copia incrustada en la portada (index.html).

Cuatro fichas de dominó de pie, en escalera, caen una sobre otra como un dominó. Cada una aterriza acostada
en su fila, pierde los puntos y se estira con un rebote hasta ser una barra de la carta Gantt de icono.svg;
la cuarta queda como el contorno del bloque de holgura. Animación SVG nativa: funciona en Safari y Chrome,
como archivo local y dentro de <img>. Con Reducir movimiento se ve el ícono quieto.

  python3 herramientas/logo-animado.py                   # versión por defecto, 1,7 s
  python3 herramientas/logo-animado.py --velocidad 1.25  # 25 % más rápida
  python3 herramientas/logo-animado.py --rebote 1.6      # más rebote al aterrizar; 0 lo quita
  python3 herramientas/logo-animado.py --cascada 1.3     # más tiempo entre una caída y la siguiente
  python3 herramientas/logo-animado.py --pausa 0.6       # más tiempo de pie antes de la primera caída
"""
import argparse
import math
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ICONO = (RAIZ / 'icono.svg').read_text(encoding='utf-8')
FONDO = re.search(r'<path d="([^"]+)"', ICONO).group(1)
BARRAS_SVG = re.findall(r'<rect [^>]*/>', ICONO)
BARRAS = [{k: (float(v) if re.fullmatch(r'[\d.]+', v) else v) for k, v in re.findall(r'([\w-]+)="([^"]*)"', r)}
          for r in BARRAS_SVG]

# Cada ficha está de pie sobre el borde inferior izquierdo de su barra y cae girando sobre esa esquina:
# acostada, su grosor es el alto de la barra y su largo, ALTO. Después se estira hasta el largo de la barra.
ALTO = 200
RADIO_FICHA = 26
REBOTE_LARGO = [22, 22, 22, 16]
CAIDA = [0.38, 0.32, 0.28, 0.26]     # segundos de cada caída: la cadena acelera
CURVA_CAIDA = (.55, .085, .68, .53)  # cada vez más rápido, como con gravedad
REBOTE_DUR, ESTIRA_DUR = 0.14, 0.40
CURVA = 'keyTimes="0;0.62;1" calcMode="spline" keySplines=".25 .1 .25 1;.45 0 .55 1"'
CURVA_PUNTOS = 'keyTimes="0;0.62;1" calcMode="spline" keySplines=".4 0 .6 1;0 0 1 1"'


def n(v):
    """224.0 → 224 · 0.060 → 0.06"""
    return ('%.3f' % v).rstrip('0').rstrip('.')


def animar(atributo, valores, inicio, dur, curva=CURVA):
    extra = ' ' + curva if len(valores) == 3 else ''
    return (f'<animate attributeName="{atributo}" values="{";".join(n(v) for v in valores)}"{extra} '
            f'begin="{n(inicio)}s" dur="{n(dur)}s" fill="freeze"/>')


def pivote(i):
    """Esquina sobre la que gira la ficha i (borde inferior izquierdo de su barra) y su grosor."""
    b = BARRAS[i]
    return b['x'], b['y'] + b['height'], b['height']


def contacto(k):
    """Grados que gira la ficha k hasta tocar la esquina superior izquierda de la siguiente."""
    px, py, _ = pivote(k)
    qx, qy, grosor = pivote(k + 1)
    return math.degrees(math.atan2(qx - grosor - px, py - (qy - ALTO)))


def fraccion(curva, avance):
    """Fracción del tiempo en que una curva de keySplines llega a ese avance."""
    x1, y1, x2, y2 = curva
    bezier = lambda a, c, u: 3 * a * u * (1 - u) ** 2 + 3 * c * u * u * (1 - u) + u ** 3
    bajo, alto = 0.0, 1.0
    for _ in range(40):
        u = (bajo + alto) / 2
        bajo, alto = (u, alto) if bezier(y1, y2, u) < avance else (bajo, u)
    return bezier(x1, x2, u)


def caidas(p):
    """Segundos en que empieza a caer cada ficha: la siguiente parte cuando la anterior la toca."""
    inicio = [p.pausa]
    for k in range(3):
        inicio.append(inicio[k] + fraccion(CURVA_CAIDA, contacto(k) / 90) * CAIDA[k] * p.cascada)
    return inicio


def ficha(i, cae, p):
    t = lambda s: s / p.velocidad
    r = p.rebote
    b = BARRAS[i]
    px, py, grosor = pivote(i)
    largo, radio = b['width'], b['rx']
    hueca = b.get('fill') == 'none'
    aterriza = cae + CAIDA[i]
    estira = t(aterriza + .02)

    dur = CAIDA[i] + REBOTE_DUR
    giro = (f'<animateTransform attributeName="transform" type="rotate" '
            f'values="0 {n(px)} {n(py)};90 {n(px)} {n(py)};{n(90 - 6 * r)} {n(px)} {n(py)};90 {n(px)} {n(py)}" '
            f'keyTimes="0;{n(CAIDA[i] / dur)};{n((CAIDA[i] + .05) / dur)};1" calcMode="spline" '
            f'keySplines="{" ".join(n(c) for c in CURVA_CAIDA)};.25 .6 .45 1;.55 0 .75 .45" '
            f'begin="{n(t(cae))}s" dur="{n(t(dur))}s" fill="freeze"/>')

    trazo = f' stroke="#fff" stroke-opacity="0" stroke-width="{n(b["stroke-width"])}"' if hueca else ''
    lineas = ['  <g>', '    ' + giro,
              f'    <rect x="{n(px - grosor)}" y="{n(py - ALTO)}" width="{n(grosor)}" height="{ALTO}" rx="{RADIO_FICHA}" '
              f'fill="#fff" fill-opacity="1"{trazo}>']
    # Acostada, el alto del rectángulo es el largo de la barra y su ancho, el grosor: se aplasta al aterrizar.
    lineas += ['      ' + a for a in (
        animar('y', (py - ALTO, py - largo - REBOTE_LARGO[i] * r, py - largo), estira, t(ESTIRA_DUR)),
        animar('height', (ALTO, largo + REBOTE_LARGO[i] * r, largo), estira, t(ESTIRA_DUR)),
        animar('x', (px - grosor, px - grosor + 8 * r, px - grosor), estira, t(ESTIRA_DUR)),
        animar('width', (grosor, grosor - 8 * r, grosor), estira, t(ESTIRA_DUR)),
        animar('rx', (RADIO_FICHA, radio - 4 * r, radio), estira, t(ESTIRA_DUR)),
    )]
    if hueca:
        lineas.append('      ' + animar('fill-opacity', (1, 0), t(aterriza + .05), t(.26)))
        lineas.append('      ' + animar('stroke-opacity', (0, b['stroke-opacity']), t(aterriza + .05), t(.26)))
    elif b.get('fill-opacity', 1) != 1:
        lineas.append('      ' + animar('fill-opacity', (1, b['fill-opacity']), estira, t(ESTIRA_DUR)))
    lineas.append('    </rect>')

    cx, escala = px - grosor / 2, grosor / 104
    pierde = t(aterriza - .04)
    circulos = ''.join(f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(16 * escala)}">'
                       f'{animar("r", (16 * escala, 0, 0), pierde, t(.2), CURVA_PUNTOS)}</circle>'
                       for cy in (py - ALTO * .75, py - ALTO * .25))
    lineas.append(f'    <g fill="url(#logo-naranja-fondo)" stroke="url(#logo-naranja-fondo)" stroke-width="9" '
                  f'stroke-linecap="round">{animar("opacity", (1, 0), pierde, t(.14))}{circulos}'
                  f'<line x1="{n(cx - 26 * escala)}" y1="{n(py - ALTO / 2)}" x2="{n(cx + 26 * escala)}" '
                  f'y2="{n(py - ALTO / 2)}"/></g>')
    lineas.append('  </g>')
    return lineas


def dibujo(p):
    lineas = [
        '<defs>',
        '  <linearGradient id="logo-naranja" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f78c3d"/>'
        '<stop offset="1" stop-color="#e04d1a"/></linearGradient>',
        '  <!-- El mismo degradado en coordenadas del ícono: los puntos se ven como agujeros en la ficha. -->',
        '  <linearGradient id="logo-naranja-fondo" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1024" y2="1024">'
        '<stop offset="0" stop-color="#f78c3d"/><stop offset="1" stop-color="#e04d1a"/></linearGradient>',
        '</defs>',
        f'<path d="{FONDO}" fill="url(#logo-naranja)"/>',
        '<g class="logo-animado">',
    ]
    # Se dibujan de izquierda a derecha: al caer, cada ficha pasa por detrás de la siguiente.
    for i, cae in enumerate(caidas(p)):
        lineas += ficha(i, cae, p)
    lineas += ['</g>', '<g class="logo-quieto">'] + ['  ' + r for r in BARRAS_SVG] + ['</g>']
    return lineas


def main():
    a = argparse.ArgumentParser(description='Genera el logo animado de Dominó.')
    a.add_argument('--velocidad', type=float, default=1.0, help='1 dura 1,7 s; 1.25 es 25 %% más rápida')
    a.add_argument('--rebote', type=float, default=1.0, help='1 es un rebote suave al aterrizar; 0 lo quita')
    a.add_argument('--cascada', type=float, default=1.0, help='tiempo entre una caída y la siguiente; 1.3 es 30 %% más')
    a.add_argument('--pausa', type=float, default=0.35, help='segundos de pie antes de la primera caída')
    p = a.parse_args()

    total = (caidas(p)[3] + CAIDA[3] + .02 + ESTIRA_DUR) / p.velocidad
    # Sin guiones dobles: XML no los admite dentro de un comentario.
    resumen = (f'herramientas/logo-animado.py · velocidad {n(p.velocidad)} · rebote {n(p.rebote)} · '
               f'cascada {n(p.cascada)} · pausa {n(p.pausa)} · {n(total)} s')

    archivo = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Dominó">',
        '<!-- El ícono de Dominó (icono.svg) animado una vez: cuatro fichas de dominó caen una sobre otra y cada una',
        '     aterriza acostada como una barra de la carta Gantt; la cuarta queda como el bloque de holgura.',
        '     Animación SVG nativa: corre también dentro de <img>. Con Reducir movimiento se ve el ícono quieto.',
        f'     {resumen} -->',
        '<style>',
        '  .logo-quieto { display: none; }',
        '  @media (prefers-reduced-motion: reduce) {',
        '    .logo-animado { display: none; }',
        '    .logo-quieto { display: inline; }',
        '  }',
        '</style>',
    ] + dibujo(p) + ['</svg>']
    (RAIZ / 'medios' / 'logo-animado.svg').write_text('\n'.join(archivo) + '\n', encoding='utf-8')

    # En la portada va incrustado para reiniciar su reloj al entrar a la lámina 1 (inicio.js), también sin servidor.
    incrustado = '\n'.join(
        ['<svg class="portada-icono portada-logo entra" id="portada-logo" style="--i:0" viewBox="0 0 1024 1024" '
         'width="128" height="128" aria-hidden="true" focusable="false">', f'<!-- {resumen} -->'] + dibujo(p) + ['</svg>'])
    index = RAIZ / 'index.html'
    html = index.read_text(encoding='utf-8')
    html, cambios = re.subn(r'<svg class="portada-icono portada-logo[^>]*>[\s\S]*?</svg>', lambda m: incrustado, html, count=1)
    if cambios != 1:
        raise SystemExit('No encontré <svg id="portada-logo"> en index.html')
    index.write_text(html, encoding='utf-8')
    print(resumen)
    print('caídas:', ', '.join(n(c / p.velocidad) + ' s' for c in caidas(p)),
          '· contacto:', ', '.join(n(contacto(k)) + '°' for k in range(3)))


if __name__ == '__main__':
    main()
