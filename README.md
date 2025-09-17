# Optimizador de Rutas Xpert Radón

Esta es una aplicación web avanzada diseñada para optimizar las rutas de trabajo de los técnicos de Xpert Radón. La herramienta utiliza la potencia de la IA generativa de Google (Gemini) para transformar una simple lista de centros de trabajo en un plan de ruta multi-día, eficiente y realista. Considera horarios de apertura, carga de trabajo, geolocalización precisa y días no laborables para crear itinerarios lógicos que maximizan la productividad.

## ✨ Características Principales

-   **Flujo de Trabajo Guiado:** Interfaz intuitiva que guía al usuario a través de un proceso de 3 pasos claros y definidos.
-   **Geocodificación Inteligente:** Convierte direcciones en coordenadas de alta precisión usando la IA y Google Search para asegurar que los técnicos lleguen al lugar correcto.
-   **Carga y Mapeo de Datos Flexibles:** Soporta archivos Excel (.xlsx, .xls) y CSV, con un sistema de mapeo de columnas para adaptarse a diferentes formatos de archivo.
-   **Filtrado y Selección Avanzados:** Permite filtrar centros por provincia, municipio y número de detectores para una planificación selectiva y enfocada.
-   **Optimización de Rutas con IA:** El núcleo de la aplicación. Genera un plan detallado que respeta:
    -   Horarios de apertura de los centros.
    -   Jornadas laborales máximas.
    -   Días no laborables y fines de semana.
    -   Estrategias de ruta (volver al origen o ruta continua).
-   **Visualización de Resultados Detallada:** Presenta el plan día por día, con paradas, horarios, y tiempos de viaje, trabajo y espera.
-   **Exportación de Datos:** Permite descargar el plan de ruta completo en formato **Excel (.xlsx)** y los eventos en un archivo de calendario **iCal (.ics)** para una fácil integración con agendas digitales.
-   **Edición de Datos en Vivo:** Posibilidad de editar o eliminar centros de trabajo directamente desde la interfaz sin necesidad de volver a cargar el archivo.

## 🚀 Cómo Funciona (Flujo de Trabajo)

1.  **Paso 1: Definir Puntos de Ruta:** Se establecen las direcciones de inicio y fin para el conjunto completo de la ruta. Estos puntos se usan para el primer y último día del plan.
2.  **Paso 2: Cargar Centros:** Se sube un archivo (Excel/CSV) con la lista de centros a visitar.
3.  **Paso 2.2: Mapear Columnas:** Se asignan las columnas del archivo a los campos requeridos por la aplicación (nombre, dirección, horas de trabajo, etc.). La aplicación intenta hacer una asignación automática inteligente.
4.  **Paso 2.3: Geocodificación Automática:** La aplicación procesa la lista en segundo plano, asignando provincia y coordenadas precisas a cada centro usando la IA.
5.  **Paso 3: Filtrar y Configurar:** Se seleccionan los centros a incluir en la ruta y se configuran los parámetros de optimización (fecha de inicio, horas por día, estrategia, etc.).
6.  **Optimizar:** Se envía la información a la IA, que genera el plan de ruta multi-día.
7.  **Revisar y Exportar:** Se visualizan los resultados detallados y se pueden exportar a Excel o iCal.

## 🛠️ Stack Tecnológico

-   **Frontend:** React (con TypeScript), Tailwind CSS
-   **IA y Lógica:** Google Gemini API (`gemini-2.5-flash`)
-   **Librerías Clave:**
    -   `@google/genai`: Para interactuar con la API de Gemini.
    -   `react-dropzone`: Para la carga de archivos mediante arrastrar y soltar.
    -   `xlsx`: Para leer y escribir archivos de Excel.
    -   `lucide-react`: Para el conjunto de iconos.

## 🔑 Configuración de la API Key

Para que la aplicación funcione, es indispensable configurar la clave de la API de Google Gemini.

La clave debe estar disponible como una variable de entorno llamada `process.env.API_KEY` en el entorno de ejecución. La aplicación está diseñada para leer esta variable directamente. **No se debe introducir la clave en el código fuente.**
