#!/usr/bin/env python3
"""Genera los PNG del logo a partir de icons/logo.svg (fuente única).

Uso: python3 scripts/generar-iconos.py

Solo depende de Pillow. Lee del SVG el color de fondo, el radio de las
esquinas, el color y ancho del trazo y los atributos `d` (solo comandos M y L).
Dibuja a 4x y reduce con LANCZOS para suavizar bordes. Las puntas y uniones
redondeadas se logran dibujando un círculo en cada vértice.

Salidas en icons/:
- icon-192.png, icon-512.png: azulejo con esquinas redondeadas y esquinas
  transparentes (purpose "any").
- icon-maskable-512.png: fondo a sangre, sin redondear (purpose "maskable");
  el launcher aplica su propia máscara. El símbolo ya cabe en el círculo
  seguro (radio 40 % = 204,8 px) sin reescalar.
- apple-touch-icon.png (180): fondo a sangre y opaco, porque iOS redondea las
  esquinas por su cuenta y pinta de negro lo transparente.
"""
import os
import re

from PIL import Image, ImageDraw

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARPETA = os.path.join(RAIZ, 'icons')
LADO_SVG = 512
SUPER = 4


def leer_svg():
    with open(os.path.join(CARPETA, 'logo.svg'), encoding='utf-8') as f:
        texto = f.read()
    rect = re.search(r'<rect[^>]*\brx="([\d.]+)"[^>]*\bfill="(#[0-9A-Fa-f]{6})"', texto)
    trazo = re.search(r'\bstroke="(#[0-9A-Fa-f]{6})"[^>]*\bstroke-width="([\d.]+)"', texto)
    caminos = []
    for d in re.findall(r'\sd="([^"]+)"', texto):
        if re.search(r'[^ML\d\s.]', d):
            raise ValueError('logo.svg: solo se admiten comandos M y L: ' + d)
        numeros = [float(n) for n in re.findall(r'[\d.]+', d)]
        caminos.append(list(zip(numeros[0::2], numeros[1::2])))
    return {
        'radio': float(rect.group(1)),
        'fondo': rect.group(2),
        'trazo': trazo.group(1),
        'ancho': float(trazo.group(2)),
        'caminos': caminos,
    }


def dibujar(logo, lado, redondeado):
    grande = lado * SUPER
    escala = grande / LADO_SVG
    imagen = Image.new('RGBA', (grande, grande), (0, 0, 0, 0))
    lienzo = ImageDraw.Draw(imagen)
    if redondeado:
        lienzo.rounded_rectangle((0, 0, grande - 1, grande - 1),
                                 radius=logo['radio'] * escala, fill=logo['fondo'])
    else:
        lienzo.rectangle((0, 0, grande - 1, grande - 1), fill=logo['fondo'])
    ancho = logo['ancho'] * escala
    for camino in logo['caminos']:
        puntos = [(x * escala, y * escala) for x, y in camino]
        lienzo.line(puntos, fill=logo['trazo'], width=round(ancho))
        r = ancho / 2
        for x, y in puntos:
            lienzo.ellipse((x - r, y - r, x + r, y + r), fill=logo['trazo'])
    return imagen.resize((lado, lado), Image.LANCZOS)


def main():
    logo = leer_svg()
    salidas = [
        ('icon-192.png', 192, True),
        ('icon-512.png', 512, True),
        ('icon-maskable-512.png', 512, False),
        ('apple-touch-icon.png', 180, False),
    ]
    for nombre, lado, redondeado in salidas:
        imagen = dibujar(logo, lado, redondeado)
        if not redondeado:
            imagen = imagen.convert('RGB')
        imagen.save(os.path.join(CARPETA, nombre), optimize=True)
        print('icons/' + nombre, lado)


if __name__ == '__main__':
    main()
