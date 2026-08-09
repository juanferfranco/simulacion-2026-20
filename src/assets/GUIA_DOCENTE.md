# Guía docente · Three.js + WebGPU/TSL compute para Unidad 3

## 1. Qué se enseña y qué no

La unidad no pretende formar desarrolladores de Three.js. El objetivo técnico es una **alfabetización suficiente para diseñar, verificar y dirigir sistemas generados con IA**.

### Sí

- scene, camera, renderer y animation loop;
- estado masivo de partículas;
- diferencia entre compute y render;
- uniforms como parámetros controlables;
- buffers de posición/velocidad;
- instancing como estrategia de render repetido;
- fuerzas, integración y estabilidad básica;
- prueba por aislamiento y predicción;
- Vite, build, preview y publicación.

### No

- WGSL de bajo nivel;
- bind groups, command encoders o creación manual de pipelines WebGPU;
- API completa de Three.js;
- construcción de un renderer desde cero;
- optimización extrema antes de tener un modelo correcto.

## 2. Modelo mental de Three.js

### Scene

Contenedor lógico de objetos que pueden renderizarse. No «simula» por sí mismo.

### Camera

Define una transformación/proyección desde el mundo 3D hacia la pantalla. En este proyecto es `PerspectiveCamera`.

### Renderer

`WebGPURenderer` coordina los pipelines de GPU. Tras `await renderer.init()`, puede ejecutar tanto `renderer.compute(...)` como `renderer.render(scene, camera)`.

### Animation loop

`renderer.setAnimationLoop(...)` define el trabajo de cada frame. En este proyecto el orden es:

1. compute del nuevo estado;
2. actualización de controles de cámara;
3. render de la escena.

## 3. Estado en GPU

`instancedArray(count, 'vec3')` crea un nodo de storage respaldado por un `StorageInstancedBufferAttribute`. Usamos dos arrays:

- posición `p_i`;
- velocidad `v_i`.

Cada invocación del compute trabaja sobre un índice `instanceIndex`, por lo que conceptualmente existen N ejecuciones de la misma regla.

La idea docente central: **las partículas no son N objetos JavaScript que recorremos con un for por frame**. El estado masivo permanece en GPU.

## 4. Compute shader y TSL

En `createSimulation.js` el compute se expresa con `Fn(() => {...})().compute(count)`.

TSL no es el contenido disciplinar de la unidad. Es una notación que permite expresar el modelo para que Three.js genere el código GPU correspondiente.

El estudiante debe reconocer este esqueleto:

```text
p = position[i]
v = velocity[i]
F = Σ fuerzas
v = v + F·dt
p = p + v·dt
```

Usamos masa unitaria para mantener el foco en composición de fuerzas.

## 5. Fuerzas incluidas

### Viento / fuerza constante

`F_w = c`

Es la prueba más clara de aceleración: partiendo del reposo, la velocidad cambia de manera monotónica en la dirección de `c`.

### Fuerza radial suavizada

```text
r = attractor - p
d = max(|r|, softening)
F_r = normalize_soft(r) · strength / d²
```

`strength > 0` atrae y `strength < 0` repele. `softening` evita singularidades numéricas cerca de `d = 0`.

### Vórtice

Se construye una dirección tangencial con un producto cruz respecto al eje Z. La fuerza no «manda a la partícula a una trayectoria circular»; introduce una componente tangencial que interactúa con las demás fuerzas.

### Drag lineal

`F_d = -c v`

Disipa energía. Es útil para evitar crecimiento indefinido de velocidad y, conceptualmente, para hablar de equilibrio dinámico.

## 6. Integración

Se usa Euler semi-implícito:

```text
v(t+dt) = v(t) + a(t) dt
p(t+dt) = p(t) + v(t+dt) dt
```

Es simple, barato y suficiente para el objetivo de la unidad. El proyecto usa `dt = 1/60` multiplicado por `timeScale`, lo que favorece resultados reproducibles. No se pretende enseñar integración numérica avanzada aquí, pero sí advertir que cambiar `dt` puede cambiar estabilidad y comportamiento.

## 7. Límites periódicos

Al salir del volumen, una partícula reaparece por el lado opuesto. Esto evita una fuerza de «pared» adicional y mantiene partículas disponibles durante performances largas.

Es una decisión de diseño del mundo, no una ley física.

## 8. Instancing

El render usa una sola geometría de plano y `InstancedMesh` para dibujar muchas copias. La posición de cada instancia proviene directamente del buffer calculado por compute.

Conceptualmente:

```text
1 geometría + 1 material + N estados de instancia
```

No conviene enseñar toda la API de instancing; basta entender por qué no queremos N meshes independientes.

## 9. Uniforms

Un uniform es el puente pedagógico clave entre **instrumento** y **modelo**. Cambiar `radialStrength.value` desde JavaScript cambia el parámetro que usa el compute sin reescribir la simulación.

Por eso los parámetros que el estudiante quiere «tocar» deben emerger como uniforms con significado, no como decenas de números arbitrarios.

## 10. Cámara y puntero

Las coordenadas del mouse están en pantalla; el atractor vive en mundo 3D. `Raycaster` proyecta el puntero desde la cámara y calcula la intersección con el plano Z=0.

Esta es una oportunidad para explicar una idea general transferible: **interacción de pantalla y espacio de simulación requieren una transformación de coordenadas**.

## 11. LAB y PERFORMANCE

### LAB

- GUI visible;
- helper del atractor;
- ejes;
- OrbitControls;
- presets de pruebas.

Pregunta: **¿El modelo hace lo que debería?**

### PERFORMANCE

- interfaz de diagnóstico oculta;
- cámara estable;
- controles expresivos mínimos;
- interpretación en tiempo real.

Pregunta: **¿Puedo conducir el sistema de forma intencional?**

## 12. Estrategia de pruebas

### Validación de comportamiento GPU

Los presets `1..5` aíslan comportamientos. El estudiante debe escribir antes:

1. condición inicial;
2. fuerza activa;
3. predicción;
4. observación;
5. conclusión.

### Prueba de integración

Después se combinan fuerzas y se verifica que desactivar una de ellas produce un cambio coherente.

### Prueba de performance

- URL limpia;
- reinicio determinístico suficiente;
- frame rate estable en el equipo de presentación;
- controles sin necesidad de abrir DevTools;
- no depender de red externa durante la interpretación, salvo cargar inicialmente el sitio si así se decide.

## 13. Diagnóstico cuando la IA genera algo incorrecto

Orden recomendado:

1. ¿La consola muestra error?
2. ¿Compila `npm run build`?
3. ¿La fuerza puede apagarse?
4. ¿El signo/dirección coincide con la predicción?
5. ¿`dt` o la magnitud hacen inestable el sistema?
6. ¿Posición y velocidad se actualizan en el compute, no en un bucle CPU accidental?
7. ¿El renderer consume el mismo storage que actualiza compute?
8. ¿La cámara simplemente está ocultando el fenómeno?

La pregunta no es ¿Qué línea está mal? sino primero ¿Qué responsabilidad del sistema está fallando?

## 14. Flujo de desarrollo

### Instalar

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

Vite crea un servidor local con recarga rápida. No abras `index.html` con `file://`; usa el servidor.

### Build

```bash
npm run build
```

Genera `dist/`.

### Verificar el build real

```bash
npm run preview
```

Esta fase es importante porque funciona en dev no garantiza por sí sola que los assets/rutas de producción sean correctos.

## 15. GitHub Pages

El workflow incluido:

1. Hace checkout;
2. Instala con `npm install`;
3. Construye `dist`;
4. Sube `dist` como artefacto de Pages;
5. Despliega.

En GitHub activa **Settings → Pages → Source: GitHub Actions**.

El uso de `base: './'` en Vite evita hard-codear el nombre del repositorio para assets estáticos. Si posteriormente usan routing complejo o assets con rutas absolutas, conviene revisar esta decisión.

## 16. Qué pedirle a un estudiante durante sustentación

Preguntas rápidas y muy discriminantes:

- «Apaga todas las fuerzas menos esta. ¿Qué predices?»
- «Invierte el signo. ¿Qué debe cambiar?»
- «¿Dónde está el estado?»
- «¿Qué código ejecuta una vez por partícula?»
- «¿Qué diferencia hay entre compute y render?»
- «¿Cuál parámetro convertiste en control interpretativo y por qué?»
- «¿Qué prueba demostraría que esta fuerza está mal implementada?»

No es necesario pedir sintaxis TSL de memoria.

## 17. Secuencia sugerida para una única sesión técnica

1. 10 min · Lumicles/Hodgin y el reto.
2. 10 min · `scene → camera → renderer → loop`.
3. 15 min · `state → compute → storage → render`.
4. 15 min · leer juntos el bloque de fuerzas.
5. 15 min · ejecutar las cinco pruebas y hacer predicciones.
6. 10 min · LAB/PERFORMANCE y mapeo interpretativo.
7. 10 min · `npm run build`, `preview` y Pages.

El resto del aprendizaje técnico debe ocurrir bajo demanda mientras diseñan, apoyado por IA y por el contrato arquitectónico del repositorio.
