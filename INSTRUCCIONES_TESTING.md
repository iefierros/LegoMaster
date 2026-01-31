# 🧪 Cómo ejecutar los tests

Este proyecto ahora incluye un conjunto de tests unitarios para verificar la funcionalidad core. Debido al entorno de ejecución, no se ha podido instalar un framework de testing como Vitest, pero se ha creado un sistema de testing manual.

## Requisitos

Asegúrate de tener todas las dependencias del proyecto instaladas:

```bash
pnpm install
```

## Ejecución de los Tests

Para ejecutar los tests, utiliza el siguiente comando en la raíz del proyecto:

```bash
pnpm exec vite-node run-tests.ts
```

Este comando utilizará `vite-node`, una herramienta que viene con Vite, para ejecutar el script de tests escrito en TypeScript.

## ¿Qué hace este comando?

1.  **`pnpm exec`**: Ejecuta un paquete de las dependencias locales.
2.  **`vite-node run-tests.ts`**: `vite-node` compila y ejecuta el archivo `run-tests.ts` en un entorno de Node.js.
3.  **`run-tests.ts`**: Este script importa y ejecuta todas las suites de tests que se han creado en el proyecto (dentro de las carpetas `src/core`, `src/parsers` y `src/physics`).

## Suites de Tests Creadas

Se han añadido los siguientes tests unitarios:

-   **PIDController**: Verifica la lógica del controlador PID.
-   **LDrawParser**: Comprueba que el parseo de archivos LDraw sea correcto.
-   **RigBuilder**: Valida la detección de ejes de ruedas.
-   **SensorSimulators**: Asegura que la clasificación de colores RGB funcione como se espera.

Si todos los tests pasan, verás un mensaje de éxito en la consola. Si alguno falla, se mostrará un error detallado.