# Aventura de Lectura en el Reino de las Palabras

App web educativa hecha con HTML, CSS y JavaScript puro. Funciona con Live Server en Visual Studio Code y guarda el progreso del estudiante en `localStorage`.

## Jerarquia

```text
lectura-reino/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
└── data/
    └── units.json
```

## Que incluye

- Pantalla principal con menu, avatar lector, progreso, recompensas, biblioteca y mapa.
- Cuatro unidades educativas:
  - Castillo de las Letras.
  - Bosque de las Palabras.
  - Montanas de los Cuentos.
  - Oceano de la Comprension Lectora.
- Actividades interactivas por unidad.
- Narracion con Web Speech API.
- Practica de pronunciacion cuando el navegador permite reconocimiento de voz.
- Efectos de sonido generados con Web Audio API.
- Animaciones CSS y escenarios visuales.

## Probar con Live Server

1. Abre Visual Studio Code.
2. Abre la carpeta `lectura-reino`.
3. Instala la extension Live Server si no la tienes.
4. Haz clic derecho sobre `index.html`.
5. Selecciona `Open with Live Server`.

> Importante: usa Live Server porque la app lee `data/units.json` con `fetch`. Si abres el HTML directo, algunos navegadores bloquean esa lectura.

## Editar contenido

Para cambiar unidades, actividades, evaluaciones, retroalimentacion, biblioteca o avatares, edita:

```text
data/units.json
```

## Subir a GitHub

Desde la terminal dentro de `lectura-reino`:

```bash
git init
git add .
git commit -m "Version inicial de app educativa"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Para futuras versiones:

```bash
git add .
git commit -m "Mejora actividades y diseno"
git push
```
