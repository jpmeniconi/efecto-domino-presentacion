#!/usr/bin/env python3
"""Logo animado de Dominó: genera medios/logo-animado.svg y su copia incrustada en la portada (index.html).

Cuatro fichas de dominó se paran en fila y, una tras otra, cambian de forma con un rebote suave hasta ser
las barras de la carta Gantt y el bloque de holgura de icono.svg. Animación SVG nativa: funciona en Safari
y Chrome, como archivo local y dentro de <img>. Con Reducir movimiento se ve el ícono quieto.

  python3 herramientas/logo-animado.py                   # versión por defecto, 1,2 s
  python3 herramientas/logo-animado.py --velocidad 1.25  # 25 % más rápida
  python3 herramientas/logo-animado.py --rebote 1.6      # más rebote; 0 lo quita
  python3 herramientas/logo-animado.py --orden 3210      # las fichas cambian de derecha a izquierda
  python3 herramientas/logo-animado.py --cascada 1.5     # más tiempo entre una ficha y la siguiente
"""
import argparse
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ICONO = (RAIZ / 'icono.svg').read_text(encoding='utf-8')
FONDO = re.search(r'<path d="([^"]+)"', ICONO).group(1)
BARRAS_SVG = re.findall(r'<rect [^>]*/>', ICONO)
BARRAS = [dict(re.findall(r'([\w-]+)="([^"]*)"', r)) for r in BARRAS_SVG]

# Ficha de pie: 104 de ancho y 200 de alto sobre la línea y = 612, con dos puntos y una raya.
PIE_X = [226, 382, 538, 694]
REBOTE_ANCHO = [22, 22, 22, 16]
CURVA = 'keyTimes="0;0.62;1" calcMode="spline" keySplines=".25 .1 .25 1;.45 0 .55 1"'
CURVA_PUNTOS = 'keyTimes="0;0.62;1" calcMode="spline" keySplines=".4 0 .6 1;0 0 1 1"'

# Segundos con velocidad 1: cada ficha se para y después cambia de forma.
PIE_INICIO, PIE_PASO, PIE_DUR = 0.060, 0.045, 0.32
CAMBIO_INICIO, CAMBIO_PASO, CAMBIO_DUR = 0.420, 0.085, 0.52


def n(v):
    """224.0 → 224 · 0.060 → 0.06"""
    return ('%.3f' % v).rstrip('0').rstrip('.')


def animar(atributo, valores, inicio, dur, curva=CURVA):
    extra = ' ' + curva if len(valores) == 3 else ''
    return (f'<animate attributeName="{atributo}" values="{";".join(n(v) for v in valores)}"{extra} '
            f'begin="{n(inicio)}s" dur="{n(dur)}s" fill="freeze"/>')


def ficha(i, k, p):
    """La ficha i, que es la k-ésima en moverse."""
    t = lambda s: s / p.velocidad
    r = p.rebote
    b = BARRAS[i]
    xf, yf, wf, hf, rf = (float(b[a]) for a in ('x', 'y', 'width', 'height', 'rx'))
    x0 = PIE_X[i]
    pie = t(PIE_INICIO + PIE_PASO * p.cascada * k)
    cambio = t(CAMBIO_INICIO + CAMBIO_PASO * p.cascada * k)
    dp, dc = t(PIE_DUR), t(CAMBIO_DUR)
    hueca = b.get('fill') == 'none'

    trazo = f' stroke="#fff" stroke-opacity="0" stroke-width="{b["stroke-width"]}"' if hueca else ''
    opacidad = '1' if hueca else b.get('fill-opacity', '1')
    lineas = [f'  <rect x="{x0}" y="612" width="104" height="0" rx="30" fill="#fff" fill-opacity="{opacidad}"{trazo}>']
    lineas += ['    ' + a for a in (
        animar('y', (612, 412 - 10 * r, 412), pie, dp),
        animar('height', (0, 200 + 10 * r, 200), pie, dp),
        animar('x', (x0, xf, xf), cambio, dc),
        animar('width', (104, wf + REBOTE_ANCHO[i] * r, wf), cambio, dc),
        animar('y', (412, yf + 4 * r, yf), cambio, dc),
        animar('height', (200, hf - 8 * r, hf), cambio, dc),
        animar('rx', (30, rf - 4 * r, rf), cambio, dc),
    )]
    if hueca:
        lineas.append('    ' + animar('fill-opacity', (1, 0), cambio + t(.05), .55 * dc))
        lineas.append('    ' + animar('stroke-opacity', (0, float(b['stroke-opacity'])), cambio + t(.05), .55 * dc))
    lineas.append('  </rect>')

    cx = x0 + 52
    circulos = ''.join(f'<circle cx="{cx}" cy="{cy}" r="16">{animar("r", (16, 0, 0), cambio, t(.2), CURVA_PUNTOS)}</circle>'
                       for cy in (462, 562))
    lineas.append(f'  <g fill="url(#logo-naranja-fondo)" stroke="url(#logo-naranja-fondo)" stroke-width="9" '
                  f'stroke-linecap="round" opacity="0">'
                  f'{animar("opacity", (0, 1), pie + .6 * dp, t(.12))}{animar("opacity", (1, 0), cambio, t(.12))}'
                  f'{circulos}<line x1="{x0 + 26}" y1="512" x2="{x0 + 78}" y2="512"/></g>')
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
    # Se dibujan de izquierda a derecha: al estirarse, cada ficha pasa por detrás de la siguiente.
    for i in range(4):
        lineas += ficha(i, p.orden.index(str(i)), p)
    lineas += ['</g>', '<g class="logo-quieto">'] + ['  ' + r for r in BARRAS_SVG] + ['</g>']
    return lineas


def main():
    a = argparse.ArgumentParser(description='Genera el logo animado de Dominó.')
    a.add_argument('--velocidad', type=float, default=1.0, help='1 dura 1,2 s; 1.25 es 25 %% más rápida')
    a.add_argument('--rebote', type=float, default=1.0, help='1 es un rebote suave; 0 lo quita')
    a.add_argument('--orden', default='0123', help='orden en que se mueven las fichas, de izquierda (0) a derecha (3)')
    a.add_argument('--cascada', type=float, default=1.0, help='separación entre fichas; 1.5 es 50 %% más')
    p = a.parse_args()
    if sorted(p.orden) != list('0123'):
        a.error('--orden usa cada ficha una vez, por ejemplo 0123 o 3210')

    total = (CAMBIO_INICIO + 3 * CAMBIO_PASO * p.cascada + CAMBIO_DUR) / p.velocidad
    resumen = (f'herramientas/logo-animado.py --velocidad {n(p.velocidad)} --rebote {n(p.rebote)} '
               f'--orden {p.orden} --cascada {n(p.cascada)} · {n(total)} s')

    archivo = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Dominó">',
        '<!-- El ícono de Dominó (icono.svg) animado una vez: cuatro fichas de dominó se paran en fila y, una tras',
        '     otra, cambian de forma con un rebote suave hasta ser las barras de la carta Gantt y el bloque de holgura.',
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


if __name__ == '__main__':
    main()
