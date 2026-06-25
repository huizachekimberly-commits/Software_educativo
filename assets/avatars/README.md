# Avatares 3D

Aqui puedes guardar modelos 3D para los avatares lectores.

Formatos recomendados:

- `.glb`
- `.gltf`

Ejemplo de estructura:

```text
assets/
└── avatars/
    ├── mago.glb
    ├── princesa.glb
    ├── caballero.glb
    └── exploradora.glb
```

Cuando descargues modelos de itch.io, revisa:

- Que la licencia permita uso educativo.
- Si pide atribucion al autor.
- Si el archivo es compatible con web: `.glb` es el mas facil.
- Que el peso no sea muy alto; idealmente menos de 5 MB por avatar.

Para activar modelos 3D reales en la app, se puede integrar despues `model-viewer` o Three.js. Por ahora la app usa avatares visuales ligeros con CSS y emoji para funcionar sin internet ni librerias externas.
