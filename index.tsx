import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { useDropzone } from 'react-dropzone';
import * as xlsx from 'xlsx';
import { GoogleGenAI, Type } from "@google/genai";
import {
  MapPin, UploadCloud, File as FileIcon, MoveRight, ArrowRight, X, ChevronDown, List, BrainCircuit, Loader2,
  Calendar, Clock, SlidersHorizontal, Map as MapIcon, User, Briefcase, Trash2, Pencil, CalendarPlus, Filter,
  Building, Waypoints, Clock4, FileDown, CalendarDays
} from 'lucide-react';

// --- TYPE DEFINITIONS ---
type Step = 'start' | 'geocoding_endpoints' | 'upload' | 'mapping' | 'geocoding' | 'optimize';

interface ColumnMapping {
  [key: string]: string | null;
}

interface WorkCenter {
  id: number;
  nombre: string;
  direccion: string;
  municipio: string;
  horasTrabajo: number;
  totalDetectores: number;
  provincia?: string;
  latitud?: number;
  longitud?: number;
  horarioGeneral?: string;
  horarioLunes?: string;
  horarioMartes?: string;
  horarioMiercoles?: string;
  horarioJueves?: string;
  horarioViernes?: string;
}

interface OptimizationResult {
    resumen: string;
    plan_optimizado: DayPlan[];
    centros_no_asignados: UnassignedCenter[];
}

interface DayPlan {
    fecha: string;
    dia_semana: string;
    resumen_dia: string;
    paradas: Stop[];
}

interface Stop {
    nombre: string;
    direccion: string;
    municipio: string;
    provincia: string;
    latitud: number;
    longitud: number;
    horario_apertura: string;
    hora_inicio: string;
    hora_fin: string;
    tipo: 'Viaje' | 'Trabajo' | 'Inicio' | 'Fin' | 'Espera';
    info_viaje?: { duracion: string; distancia: string; };
    info_trabajo?: { duracion: string; };
    total_detectores?: number;
}

interface UnassignedCenter {
    nombre: string;
    direccion: string;
    motivo: string;
}

const XPERT_RADON_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQ4IDc5LjE2NDAzNiwgMjAxOS8wOC8xMy0xNjo0MDoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIxLjAgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6M0Q3ODAyRDk4RkM1MTFFQUEzOTZFNzU0NjJDRjczMUYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6M0Q3ODAyREE4RkM1MTFFQUEzOTZFNzU0NjJDRjczMUYiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozRDc4MDJENzhGQzUxMUVBQTQxMkZFOTc4MTgyNDMyQyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozRDc4MDJENzhGQzUxMUVBQTQxMkZFOTc4MTgyNDMyQyIvPiA8L3JkZjpEZXNjcmlwdGlvbi4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgG4S6YAAARPSURBVHja7N1pV5pAEIDhA0hKk9Q9p3sIqbsn955TegghpSRJ2qT3f82N0YjOAkI4wZzH5z0FvGfsmWe19g8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKzGtnnzXbA2m7W/9+2233dv39sL1y+1P+BfX97+fuvx9o/b325/tP3V9tvtn3c3b28/bX+2/cX219sfbr+0/cL219s/bv+0/dX2V9v/FAD+/PY/b/9++x/AP7/9f9v+YvvX279u/7L9xfY328/e/mz7k/W3W5+zP9l+s/3z7rW/2n67/dNut9/f/nv7h+1ftr/Y/t7t/uT2d9v/N/757R+3v9/+ZfvX7X/evn/Y/m77u9e/Z//l9jfbb7e/2X6z/eP2t+sfQfjv/1s3bd+yfZX2z3/ffvT2h+z/+WHAz+/fb//4/bH28dtf8M+/2T7i+0f/j39E/vD2/e3v9t++v637U/bP2x/tv0DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsmX9Q7j3K/7f9m/av29ds/8A+d/v+7R+3f7V9hfb3t+9f/z6b32D/YftH7e+332//vP1t9k/bb7b/bPuc/X/+/PaP2//8//MfbL+y/c72u9s/bn+4/bn2t+tvtj+sX9/+kfbP7A8J+P1P2z/k/wB+e/ub7f90+/+N/8G/s303+zP2v9tfbb+w/ZXt1+yPtz/Yvsv+cPtr7G+3X21/sv3b7c/bH2x/vv1T9tfbb7Y/275of7L9wfYfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABY4n+I9q/b32//vP13t38B+/vtr7c/3r5v+5TtJ7c/3n5n+2z7s9vfbb9uf5j9p9t/bn+2fbX96fbn2j+x/6b9kfZX2//U3b/9s+2ft3/i/yH+t/YftX+4/YH2F9sfbf+s/dX2f7A/2n6i/VH9m/bH2//Z/mn7I9u3t/9q/7a7n/sHtr+v/Vv9g+/vbL/i7uf+ofZn2n/Xfqb90faH2x/sv8/+3/bn2/+v/bH2H9jfbv8A4G/bn2z/uP2r7X+2n9l+zfbf7M+1v9r+d/vfAAAAAAAAAAAAAAAAYL3+A6T9RfsHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsq/1F+4vtv+h+8vZn21dvP7P9sfs/Zn+6fbP9tfaHt2/sD7N/tP3U9je37+xPtt/dvr/96/Y32z+z32t/sv0L+3+x/Wn73+2n2l+yf8D9s/YX7M+1/9r+e/sv7B+239l+xv6fAIA3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHif8V5/+y8AAwDAgP2P+B+GAAAAAElFTkSuQmCC";

const MAPPING_FIELDS = {
    required: {
        nombre: 'Nombre del Centro',
        direccion: 'Dirección',
        municipio: 'Municipio',
        horasTrabajo: 'Horas de Trabajo',
        totalDetectores: 'Total de Detectores'
    },
    optional: {
        provincia: 'Provincia',
        horarioGeneral: 'Horario General (Fallback)',
        horarioLunes: 'Horario Lunes',
        horarioMartes: 'Horario Martes',
        horarioMiercoles: 'Horario Miércoles',
        horarioJueves: 'Horario Jueves',
        horarioViernes: 'Horario Viernes',
    }
};

// --- MAIN APP ---
const App = () => {
    const [step, setStep] = useState<Step>('start');
    const [startAddress, setStartAddress] = useState('');
    const [endAddress, setEndAddress] = useState('');
    const [geocodedEndpoints, setGeocodedEndpoints] = useState<{ start: { lat: number, lon: number } | null, end: { lat: number, lon: number } | null }>({ start: null, end: null });

    const [file, setFile] = useState<File | null>(null);
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [fileData, setFileData] = useState<any[]>([]);

    const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});

    const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
    const [filters, setFilters] = useState({ provinces: [] as string[], municipality: '', minDetectors: 0 });
    const [selectedCenterIds, setSelectedCenterIds] = useState<Set<number>>(new Set());
    
    const [editingCenter, setEditingCenter] = useState<WorkCenter | null>(null);

    const [optimizationParams, setOptimizationParams] = useState({
        startDate: new Date().toISOString().split('T')[0],
        startTime: '08:30',
        nonWorkingDays: [] as string[],
        maxHoursPerDay: 8,
        strategy: 'Volver al Origen'
    });
    
    const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // --- Handlers & Logic ---
    const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number }> => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
            Actúa como un API de geocodificación de ultra-precisión. Tu única tarea es devolver las coordenadas para la dirección proporcionada.
            Utiliza Google Search para encontrar la ubicación más precisa posible.
            La dirección es: "${address}"
            Devuelve tu respuesta como un string JSON con el formato: {"lat": <latitud>, "lon": <longitud>}. No incluyas nada más en tu respuesta.
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        try {
            // Extraer el objeto JSON del texto de respuesta.
            const jsonString = response.text.match(/{.*}/s)?.[0];
            if (!jsonString) {
                throw new Error("La IA no devolvió un JSON válido.");
            }
            const parsed = JSON.parse(jsonString);
            if (typeof parsed.lat !== 'number' || typeof parsed.lon !== 'number') {
                throw new Error("El JSON devuelto no tiene el formato correcto de lat/lon.");
            }
            return parsed;
        } catch (e: any) {
            console.error("Error al parsear la respuesta de geocodificación:", response.text, e);
            throw new Error(`No se pudieron obtener coordenadas para "${address}".`);
        }
    };


    const handleStartContinue = async () => {
        if (!startAddress || !endAddress) return;
        setStep('geocoding_endpoints');
        setError(null);
        try {
            const [startCoords, endCoords] = await Promise.all([
                geocodeAddress(startAddress),
                geocodeAddress(endAddress)
            ]);
            setGeocodedEndpoints({ start: startCoords, end: endCoords });
            setStep('upload');
        } catch (err: any) {
            setError(err.message);
            setStep('start');
        }
    };
    
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const f = acceptedFiles[0];
        if (!f) return;
        setFile(f);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target!.result as ArrayBuffer);
            const workbook = xlsx.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
            
            if (jsonData.length > 0) {
                const headers = Object.keys(jsonData[0]);
                setFileHeaders(headers);
                setFileData(jsonData);

                const initialMapping: ColumnMapping = {};
                const allFields = { ...MAPPING_FIELDS.required, ...MAPPING_FIELDS.optional };
                for (const fieldKey in allFields) {
                    const fieldLabel = allFields[fieldKey as keyof typeof allFields];
                    const matchingHeader = headers.find(h => h.toLowerCase().trim().replace(/\s+/g, '') === fieldLabel.toLowerCase().trim().replace(/\s+/g, ''));
                    if (matchingHeader) {
                        initialMapping[fieldKey] = matchingHeader;
                    }
                }
                setColumnMapping(initialMapping);

                setStep('mapping');
            } else {
                setError("El archivo parece estar vacío.");
            }
        };
        reader.readAsArrayBuffer(f);
    }, []);

    const handleMappingContinue = async () => {
        const mappedData: WorkCenter[] = fileData.map((row, index) => {
            const center: any = { id: index };
            for (const key in MAPPING_FIELDS.required) {
                center[key] = row[columnMapping[key]!] ?? '';
            }
            for (const key in MAPPING_FIELDS.optional) {
                if (columnMapping[key]) {
                    center[key] = row[columnMapping[key]!] ?? '';
                }
            }
            center.horasTrabajo = parseFloat(String(center.horasTrabajo).replace(',','.')) || 0;
            center.totalDetectores = parseInt(String(center.totalDetectores), 10) || 0;
            return center;
        }).filter(c => c.nombre && c.direccion);

        setStep('geocoding');
        setError(null);

        try {
            const centersToGeocode = mappedData.map(({ id, nombre, direccion, municipio }) => ({
                id,
                nombre,
                direccion: `${direccion}, ${municipio}`,
            }));
            
            const prompt = `
                Tu única misión es actuar como un sistema de geocodificación de precisión milimétrica para España. La exactitud de las coordenadas es un requisito NO NEGOCIABLE y absolutamente crítico para la navegación GPS de nuestros técnicos. Tu salida se usará directamente en un sistema de GPS; los errores son inaceptables.
                Para la siguiente lista de centros, determina la provincia correcta y proporciona las coordenadas de latitud y longitud con la MÁXIMA PRECISIÓN DECIMAL posible. NO REDONDEES ni simplifiques ningún valor bajo ninguna circunstancia. Cada decimal es vital para evitar que el técnico acabe en una ubicación incorrecta.
                Devuelve una lista COMPLETA de objetos JSON, donde cada objeto contiene el 'id' original, la 'provincia' que has determinado, la 'latitud' y la 'longitud'.
                Si un centro es imposible de localizar, devuelve la provincia como un string vacío y las coordenadas como 0 para ese ID específico, pero continúa procesando el resto de la lista.

                Centros a procesar:
                ${JSON.stringify(centersToGeocode)}
            `;

            const schema = {
                type: Type.OBJECT,
                properties: {
                    centros: {
                        type: Type.ARRAY,
                        description: "Lista de centros con su provincia y coordenadas asignadas.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.NUMBER },
                                provincia: { type: Type.STRING },
                                latitud: { type: Type.NUMBER },
                                longitud: { type: Type.NUMBER }
                            },
                            required: ['id', 'provincia', 'latitud', 'longitud']
                        }
                    }
                },
                required: ['centros']
            };

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                }
            });
            
            const resultData = JSON.parse(response.text) as { centros: Array<{id: number; provincia: string; latitud: number; longitud: number;}> };

            if (!resultData || !Array.isArray(resultData.centros)) {
                throw new Error("La respuesta de la IA no contiene un array 'centros' válido.");
            }

            const geoDataMap: Map<number, { provincia: string; latitud: number; longitud: number; }> = new Map(resultData.centros.map((item) => 
                [item.id, { provincia: item.provincia, latitud: item.latitud, longitud: item.longitud }]
            ));

            const updatedWorkCenters: WorkCenter[] = mappedData.map(center => {
                const geoData = geoDataMap.get(center.id);
                return {
                    ...center,
                    provincia: geoData?.provincia || center.provincia || '',
                    latitud: geoData?.latitud,
                    longitud: geoData?.longitud,
                };
            });
            
            setWorkCenters(updatedWorkCenters);
            setStep('optimize');
        } catch (err: any) {
            console.error("Error geocoding centers:", err);
            setError(`Error durante la geolocalización: ${err.message}. Se procederá sin datos de geolocalización precisos, podrá asignarlos manualmente.`);
            // Fallback: proceed with original data
            setWorkCenters(mappedData);
            setStep('optimize');
        }
    };

    const handleDeleteCenter = (centerId: number) => {
        setWorkCenters(prev => prev.filter(c => c.id !== centerId));
        setSelectedCenterIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(centerId);
            return newSet;
        });
    };

    const handleSaveCenter = (updatedCenter: WorkCenter) => {
        setWorkCenters(prev => prev.map(c => c.id === updatedCenter.id ? updatedCenter : c));
        setEditingCenter(null);
    };
    
    const handleOptimize = async () => {
        if (!geocodedEndpoints.start || !geocodedEndpoints.end) {
            setError("Las coordenadas de inicio y fin no están disponibles. Por favor, reinicie el proceso.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setOptimizationResult(null);

        const centersToOptimize = workCenters.filter(c => selectedCenterIds.has(c.id));
        
        const prompt = `
            Eres un experto en logística y optimización de rutas para Xpert Radón. Tu misión obligatoria es crear un plan de ruta multi-día DETALLADO, REALISTA y COMPLETO para un solo técnico.

            **REGLAS FUNDAMENTALES (NO NEGOCIABLES):**
            1.  **Regla de Inclusión Total (CRÍTICA):** DEBES incluir **TODOS Y CADA UNO** de los centros de trabajo proporcionados en el plan optimizado. Es obligatorio. No puedes dejar ninguno fuera. Si para incluirlos a todos necesitas más días, el plan DEBE extenderse por tantos días como sea necesario. La sección 'centros_no_asignados' solo debe usarse en un caso extremo e improbable: si los datos de un centro son lógicamente imposibles de planificar (ej. las 'horas de trabajo en sitio' son superiores a las horas que el centro está abierto).

            2.  **Coordenadas de Precisión Milimétrica:** Para todos los cálculos, DEBES USAR las coordenadas proporcionadas. Son de ultra-alta precisión y no deben ser recalculadas.
                - **Coordenadas de Inicio General (Solo primer día):** ${geocodedEndpoints.start.lat}, ${geocodedEndpoints.start.lon}
                - **Coordenadas de Fin General (Solo último día):** ${geocodedEndpoints.end.lat}, ${geocodedEndpoints.end.lon}
                - En tu respuesta, devuelve estas mismas coordenadas para cada centro. Para las paradas de 'Inicio' y 'Fin', usa la dirección original proporcionada como el campo 'nombre' y sus coordenadas correspondientes.

            3.  **Regla Sagrada - Horarios de Apertura:** Esta regla es **INQUEBRANTABLE**. La optimización DEBE respetar estrictamente los horarios de apertura.
                - El técnico **NUNCA** puede llegar a un centro antes de su hora de apertura. Si la ruta eficiente le hace llegar antes, el plan DEBE incluir una parada de tipo 'Espera' explícita. Este tiempo de espera cuenta como parte de la jornada laboral.
                - La hora de finalización del trabajo en un centro debe ser **SIEMPRE** anterior o igual a su hora de cierre.
                - Un plan que no respete esto es un plan inválido.

            4.  **Jornada Laboral y Descansos:** La jornada diaria (viaje + trabajo + esperas) no puede exceder las ${optimizationParams.maxHoursPerDay} horas. No se trabaja en sábado, domingo, ni en los siguientes días no laborables: ${optimizationParams.nonWorkingDays.join(', ') || 'Ninguno'}.

            **PARÁMETROS DE LA RUTA:**
            - **Dirección de Inicio General (Solo para el primer día):** ${startAddress}
            - **Dirección de Fin General (Solo para el último día):** ${endAddress}
            - **Fecha y Hora de Comienzo:** ${optimizationParams.startDate} a las ${optimizationParams.startTime}.
            - **Estrategia Multi-Día:** "${optimizationParams.strategy}"
                - **Volver al Origen:** Cada día, la ruta comienza en las coordenadas de inicio general y termina en las coordenadas de fin general.
                - **Ruta Continua:** El inicio y fin generales solo se usan al principio del primer día y al final del último día.
                    - **Día 1:** Comienza en 'Inicio General', termina en la ubicación del último cliente visitado.
                    - **Días Intermedios:** Comienza donde terminó el día anterior, termina en la ubicación del último cliente del día actual.
                    - **Último Día:** Comienza donde terminó el día anterior, finaliza en 'Fin General'.

            **CENTROS DE TRABAJO A VISITAR (${centersToOptimize.length}):**
            ${centersToOptimize.map(c => `
            - Nombre: "${c.nombre}"
              Dirección: "${c.direccion}, ${c.municipio}, ${c.provincia}"
              Coordenadas (Lat, Lng): ${c.latitud}, ${c.longitud}
              Horas de trabajo en sitio: ${c.horasTrabajo}
              Total Detectores: ${c.totalDetectores}
              Horarios: Lun:${c.horarioLunes || c.horarioGeneral || 'No esp.'},Mar:${c.horarioMartes || c.horarioGeneral || 'No esp.'},Mié:${c.horarioMiercoles || c.horarioGeneral || 'No esp.'},Jue:${c.horarioJueves || c.horarioGeneral || 'No esp.'},Vie:${c.horarioViernes || c.horarioGeneral || 'No esp.'}
            `).join('')}

            **TU MISIÓN OBLIGATORIA:**
            Genera un plan de ruta JSON detallado. Agrupa geográficamente las visitas para máxima eficiencia.
            - **Estructura:** Para CADA día, la lista de 'paradas' DEBE comenzar con una parada de tipo 'Inicio' y terminar con una de tipo 'Fin'.
            - **Coordenadas en la Salida:** Para CADA parada ('Inicio', 'Trabajo', 'Fin', 'Espera'), DEBES incluir la latitud y longitud precisas que has usado.
        `;

        const schema = {
            type: Type.OBJECT,
            properties: {
                resumen: { type: Type.STRING, description: "Resumen global del plan de optimización." },
                plan_optimizado: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            fecha: { type: Type.STRING, description: "Fecha del día en formato YYYY-MM-DD." },
                            dia_semana: { type: Type.STRING, description: "Nombre del día de la semana." },
                            resumen_dia: { type: Type.STRING, description: "Breve resumen de la jornada de este día." },
                            paradas: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        nombre: { type: Type.STRING },
                                        direccion: { type: Type.STRING },
                                        municipio: { type: Type.STRING },
                                        provincia: { type: Type.STRING },
                                        latitud: { type: Type.NUMBER, description: "Latitud geográfica de la parada." },
                                        longitud: { type: Type.NUMBER, description: "Longitud geográfica de la parada." },
                                        total_detectores: { type: Type.NUMBER, description: "Total de detectores. Solo aplica a 'Trabajo'." },
                                        horario_apertura: { type: Type.STRING, description: "Horario de apertura del centro usado." },
                                        hora_inicio: { type: Type.STRING, description: "HH:MM" },
                                        hora_fin: { type: Type.STRING, description: "HH:MM" },
                                        tipo: { type: Type.STRING, enum: ['Viaje', 'Trabajo', 'Inicio', 'Fin', 'Espera'] },
                                        info_viaje: { type: Type.OBJECT, properties: { duracion: { type: Type.STRING }, distancia: { type: Type.STRING } } },
                                        info_trabajo: { type: Type.OBJECT, properties: { duracion: { type: Type.STRING } } }
                                    },
                                    required: ['nombre', 'direccion', 'latitud', 'longitud', 'hora_inicio', 'hora_fin', 'tipo']
                                }
                            }
                        },
                        required: ['fecha', 'dia_semana', 'resumen_dia', 'paradas']
                    }
                },
                centros_no_asignados: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            nombre: { type: Type.STRING },
                            direccion: { type: Type.STRING },
                            motivo: { type: Type.STRING }
                        },
                        required: ['nombre', 'direccion', 'motivo']
                    }
                }
            },
            required: ['resumen', 'plan_optimizado', 'centros_no_asignados']
        };

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: schema,
              }
            });
            const resultData = JSON.parse(response.text);
            setOptimizationResult(resultData);
        } catch (err: any) {
            console.error("Error optimizing route:", err);
            setError(`Error al contactar con la IA: ${err.message}. ${err.text ? err.text() : ''}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const allProvinces = useMemo(() => {
        const provinceSet = new Set<string>();
        let hasUnassigned = false;
        workCenters.forEach(c => {
            if (c.provincia && c.provincia.trim()) {
                provinceSet.add(c.provincia.trim());
            } else {
                hasUnassigned = true;
            }
        });
        const sortedProvinces = Array.from(provinceSet).sort();
        if (hasUnassigned) {
            sortedProvinces.unshift('Sin Provincia');
        }
        return sortedProvinces;
    }, [workCenters]);

    const maxDetectors = useMemo(() => Math.max(1, ...workCenters.map(c => c.totalDetectores)), [workCenters]);
    
    const filteredAndSortedCenters = useMemo(() => {
        return workCenters
            .filter(c => {
                const provinceMatch = filters.provinces.length === 0 ||
                    (filters.provinces.includes('Sin Provincia') && (!c.provincia || !c.provincia.trim())) ||
                    (c.provincia && filters.provinces.includes(c.provincia.trim()));
                const municipalityMatch = c.municipio.toLowerCase().includes(filters.municipality.toLowerCase());
                const detectorsMatch = c.totalDetectores >= filters.minDetectors;
                return provinceMatch && municipalityMatch && detectorsMatch;
            })
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [workCenters, filters]);

    const selectedWorkHours = useMemo(() => {
        return workCenters
            .filter(c => selectedCenterIds.has(c.id))
            .reduce((acc, c) => acc + c.horasTrabajo, 0);
    }, [workCenters, selectedCenterIds]);
    
    const handleSelectAll = () => {
        const allIds = new Set(filteredAndSortedCenters.map(c => c.id));
        setSelectedCenterIds(allIds);
    };

    const handleClearSelection = () => {
        setSelectedCenterIds(new Set());
    };
    
    const toggleCenterSelection = (id: number) => {
        const newSelection = new Set(selectedCenterIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedCenterIds(newSelection);
    };

    const restartProcess = () => {
        setStep('start');
        setStartAddress('');
        setEndAddress('');
        setGeocodedEndpoints({ start: null, end: null });
        setFile(null);
        setFileHeaders([]);
        setFileData([]);
        setColumnMapping({});
        setWorkCenters([]);
        setSelectedCenterIds(new Set());
        setOptimizationResult(null);
        setError(null);
    };
    
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] }, maxFiles: 1 });

    // --- RENDER ---
    const renderContent = () => {
        switch(step) {
            case 'start': return <Step1_StartEndPoints value={{startAddress, endAddress}} onChange={{setStartAddress, setEndAddress}} onContinue={handleStartContinue} error={error} />;
            case 'geocoding_endpoints': return <Step_GeocodingEndpoints />;
            case 'upload': return <Step2_FileUpload dropzoneProps={{getRootProps, getInputProps, isDragActive}} file={file} />;
            case 'mapping': return <Step2_2_ColumnMapping file={file} headers={fileHeaders} fields={MAPPING_FIELDS} mapping={columnMapping} setMapping={setColumnMapping} onContinue={handleMappingContinue} onCancel={restartProcess} />;
            case 'geocoding': return <Step_Geocoding />;
            case 'optimize': return <Step3_FilterAndOptimize 
                filters={{...filters, maxDetectors}} setFilters={setFilters} allProvinces={allProvinces}
                centers={filteredAndSortedCenters} selectedIds={selectedCenterIds} toggleSelection={toggleCenterSelection}
                selectAll={handleSelectAll} clearSelection={handleClearSelection}
                params={optimizationParams} setParams={setOptimizationParams}
                selectedCount={selectedCenterIds.size} selectedHours={selectedWorkHours}
                onOptimize={handleOptimize} result={optimizationResult} setResult={setOptimizationResult} isLoading={isLoading} error={error}
                onEditCenter={setEditingCenter} onDeleteCenter={handleDeleteCenter}
                restart={restartProcess}
                startAddress={startAddress}
                endAddress={endAddress}
            />;
            default: return <div>Error: paso desconocido</div>
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <header className="bg-white shadow-sm sticky top-0 z-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                         <div className="flex items-center gap-3">
                            <img src={XPERT_RADON_LOGO_BASE64} alt="Xpert Radón Logo" className="h-10 w-auto"/>
                            <span className="text-xl font-bold text-slate-800">Optimizador de Rutas</span>
                         </div>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {renderContent()}
                {editingCenter && (
                    <EditCenterModal
                        center={editingCenter}
                        onSave={handleSaveCenter}
                        onCancel={() => setEditingCenter(null)}
                    />
                )}
            </main>
            <footer className="text-center py-4 text-sm text-slate-500">
                © {new Date().getFullYear()} Xpert Radón. Todos los derechos reservados.
            </footer>
        </div>
    );
};

// --- UI COMPONENTS ---

const Step1_StartEndPoints = ({ value, onChange, onContinue, error } : any) => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-8">
            <MapPin className="mx-auto h-12 w-12 text-blue-500" />
            <h1 className="text-2xl font-bold text-slate-800 mt-4">Paso 1: Definir Puntos de Inicio y Fin de Ruta</h1>
            <p className="text-slate-500 mt-2">Introduce las direcciones para el inicio de toda la ruta y el fin de toda la ruta. Estos puntos pueden ser los mismos.</p>
        </div>
        {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
                <strong className="font-bold">Error de Geolocalización: </strong>
                <span className="block sm:inline">{error} Por favor, revise las direcciones e inténtelo de nuevo.</span>
            </div>
        )}
        <div className="space-y-6">
            <div>
                <label htmlFor="start-address" className="block text-sm font-medium text-slate-700">Dirección de Inicio de la Ruta Completa</label>
                <input type="text" id="start-address" value={value.startAddress} onChange={e => onChange.setStartAddress(e.target.value)} placeholder="Ej: Domicilio u oficina central" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
                <label htmlFor="end-address" className="block text-sm font-medium text-slate-700">Dirección de Fin de la Ruta Completa</label>
                <input type="text" id="end-address" value={value.endAddress} onChange={e => onChange.setEndAddress(e.target.value)} placeholder="Ej: Domicilio u oficina central" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <button onClick={onContinue} disabled={!value.startAddress || !value.endAddress} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Confirmar y Continuar <MoveRight className="ml-2 h-5 w-5" />
            </button>
        </div>
    </div>
);

const Step2_FileUpload = ({ dropzoneProps, file } : any) => (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Paso 2: Cargar Centros de Trabajo</h1>
            <p className="text-slate-500 mt-2">Sube el archivo Excel (.xlsx, .xls, .csv) con la lista de ubicaciones a visitar.</p>
        </div>
        <div {...dropzoneProps.getRootProps()} className={`p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${dropzoneProps.isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'}`}>
            <input {...dropzoneProps.getInputProps()} />
            <div className="flex flex-col items-center text-center">
                <UploadCloud className="h-12 w-12 text-slate-400 mb-4" />
                {dropzoneProps.isDragActive ?
                    <p className="text-blue-600 font-semibold">Suelte el archivo aquí...</p> :
                    <p className="text-slate-500">Arrastra y suelta tu archivo aquí, o <span className="text-blue-600 font-semibold">haz clic para seleccionar</span>.</p>
                }
                <p className="text-xs text-slate-400 mt-2">Soportados: .xlsx, .xls, .csv</p>
            </div>
        </div>
        {file && (
            <div className="mt-4 p-3 bg-slate-100 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileIcon className="h-5 w-5 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">{file.name}</span>
                </div>
            </div>
        )}
    </div>
);

const Step2_2_ColumnMapping = ({ file, headers, fields, mapping, setMapping, onContinue, onCancel } : any) => {
    const handleMappingChange = (field: string, value: string) => {
        setMapping({ ...mapping, [field]: value });
    };

    const isContinueDisabled = Object.keys(fields.required).some(key => !mapping[key]);

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Paso 2.2: Mapear Columnas</h1>
            <p className="text-slate-500 mb-6">Asigna las columnas de tu archivo a los campos que necesita la aplicación. Hemos pre-seleccionado las coincidencias encontradas.</p>
            
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-3">
                <List className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">{file.name}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">Columnas Obligatorias</h3>
                    <div className="space-y-4">
                        {Object.entries(fields.required).map(([key, label]) => (
                            <div key={key}>
                                <label className="block text-sm font-medium text-slate-600">{label as string} <span className="text-red-500">*</span></label>
                                <select value={mapping[key] || ''} onChange={e => handleMappingChange(key, e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-slate-900">
                                    <option value="" disabled>-- Seleccionar Columna --</option>
                                    {headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">Columnas Opcionales</h3>
                    <div className="space-y-4">
                        {Object.entries(fields.optional).map(([key, label]) => (
                             <div key={key}>
                                <label className="block text-sm font-medium text-slate-600">{label as string}</label>
                                <select value={mapping[key] || ''} onChange={e => handleMappingChange(key, e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-slate-900">
                                    <option value="">-- Ignorar --</option>
                                    {headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-between items-center">
                <button onClick={onCancel} className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2">
                    <X className="h-4 w-4" /> Cancelar
                </button>
                <button onClick={onContinue} disabled={isContinueDisabled} className="flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Confirmar Mapeo y Continuar <ArrowRight className="ml-2 h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

const Step_GeocodingEndpoints = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md text-center">
        <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
        <h1 className="text-2xl font-bold text-slate-800 mt-4">Geolocalizando Puntos de Ruta</h1>
        <p className="text-slate-500 mt-2">
            Obteniendo coordenadas de alta precisión para las direcciones de inicio y fin. Esto puede tardar unos segundos...
        </p>
    </div>
);


const Step_Geocoding = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md text-center">
        <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
        <h1 className="text-2xl font-bold text-slate-800 mt-4">Geolocalizando Centros de Trabajo</h1>
        <p className="text-slate-500 mt-2">
            Usando IA para asignar provincias y coordenadas precisas a cada centro. Esto puede tardar unos segundos...
        </p>
    </div>
);

const Step3_FilterAndOptimize = (props: any) => {
    const { 
        filters, setFilters, allProvinces, centers, selectedIds, toggleSelection, selectAll, clearSelection,
        params, setParams, selectedCount, selectedHours, onOptimize, result, isLoading, error, 
        onEditCenter, onDeleteCenter, restart, setResult, startAddress, endAddress
    } = props;

    const [tempNonWorkingDay, setTempNonWorkingDay] = useState('');

    const addNonWorkingDay = () => {
        if (tempNonWorkingDay && !params.nonWorkingDays.includes(tempNonWorkingDay)) {
            setParams({...params, nonWorkingDays: [...params.nonWorkingDays, tempNonWorkingDay]});
            setTempNonWorkingDay('');
        }
    };
    
    const removeNonWorkingDay = (day: string) => {
        setParams({...params, nonWorkingDays: params.nonWorkingDays.filter((d: string) => d !== day)});
    };

    const handleProvinceToggle = (province: string) => {
        const newProvinces = new Set(filters.provinces);
        if (newProvinces.has(province)) {
            newProvinces.delete(province);
        } else {
            newProvinces.add(province);
        }
        setFilters({ ...filters, provinces: Array.from(newProvinces) });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Paso 3: Filtrar y Optimizar</h1>
                <button onClick={restart} className="text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-md px-3 py-1.5 shadow-sm">
                    Reiniciar Proceso
                </button>
            </div>
            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6" role="alert">
                    <p className="font-bold">Error en el Proceso</p>
                    <p>{error}</p>
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Panel: Filters */}
                <div className="lg:col-span-3">
                    <div className="bg-white p-4 rounded-lg shadow-md sticky top-24">
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><Filter className="w-5 h-5" /> Filtros</h3>
                        <div className="space-y-4">
                            <div className="border-t border-slate-200 pt-4">
                                <label className="text-sm font-medium text-slate-900">Provincia</label>
                                <div className="mt-2 space-y-1">
                                    <button
                                        onClick={() => setFilters({ ...filters, provinces: [] })}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${filters.provinces.length === 0 ? 'bg-blue-600 text-white' : 'bg-slate-50 hover:bg-slate-100'}`}
                                    >
                                        Todas las Provincias
                                    </button>
                                    {allProvinces.map((p: string) => (
                                        <button
                                            key={p}
                                            onClick={() => handleProvinceToggle(p)}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${filters.provinces.includes(p) ? 'bg-blue-600 text-white' : 'bg-slate-50 hover:bg-slate-100'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="border-t border-slate-200 pt-4">
                                <label htmlFor="municipio-filter" className="text-sm font-medium">Municipio</label>
                                <input id="municipio-filter" type="text" placeholder="Filtrar por municipio..." value={filters.municipality} onChange={e => setFilters({...filters, municipality: e.target.value})} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm" />
                            </div>
                             <div className="border-t border-slate-200 pt-4">
                                <label htmlFor="detectors-filter" className="text-sm font-medium">Min. Detectores: {filters.minDetectors}</label>
                                <input id="detectors-filter" type="range" min="0" max={filters.maxDetectors} value={filters.minDetectors} onChange={e => setFilters({...filters, minDetectors: parseInt(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-1" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center Panel: Centers List */}
                <div className="lg:col-span-5">
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Centros Disponibles ({centers.length})</h3>
                            <div>
                                <button onClick={selectAll} className="text-sm font-medium text-blue-600 hover:text-blue-800">Seleccionar Todos ({centers.length})</button>
                                <span className="mx-2 text-slate-300">|</span>
                                <button onClick={clearSelection} className="text-sm font-medium text-blue-600 hover:text-blue-800">Limpiar Selección</button>
                            </div>
                        </div>
                        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                           {centers.map((c: WorkCenter) => (
                                <div key={c.id} onClick={() => toggleSelection(c.id)} className={`relative p-3 border rounded-md cursor-pointer transition-colors ${selectedIds.has(c.id) ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300' : 'bg-white border-slate-200 hover:border-blue-400'}`}>
                                    <div className="absolute top-2 right-2 flex gap-1 bg-white/50 backdrop-blur-sm rounded-full p-0.5">
                                        <button onClick={(e) => { e.stopPropagation(); onEditCenter(c); }} className="p-1 text-slate-500 hover:text-blue-600 rounded-full hover:bg-slate-100 transition-colors"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteCenter(c.id); }} className="p-1 text-slate-500 hover:text-red-600 rounded-full hover:bg-slate-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div className="pr-12">
                                            <p className="font-semibold text-slate-800">{c.nombre}</p>
                                            <p className="text-sm text-slate-500 flex items-center gap-1.5"><MapPin className="w-3 h-3 flex-shrink-0"/> {c.direccion}, {c.municipio}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-2">
                                            <p className="text-sm font-medium text-slate-700">{c.provincia || <span className="text-slate-400 italic">N/A</span>}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3"/> {c.horasTrabajo}h</span>
                                        <span className="flex items-center gap-1.5 font-mono"># {c.totalDetectores} detectores</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Optimization & Results */}
                <div className="lg:col-span-4">
                    <div className="bg-white p-4 rounded-lg shadow-md sticky top-24">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-96">
                                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                                <p className="mt-4 text-slate-600 font-semibold">Optimizando ruta...</p>
                                <p className="text-sm text-slate-500">La IA está trabajando en tu plan.</p>
                            </div>
                        ) : result ? (
                            <ResultsPanel result={result} onNewOptimization={() => setResult(null)} startAddress={startAddress} endAddress={endAddress} />
                        ) : (
                            <OptimizationPanel 
                                params={params} setParams={setParams} 
                                selectedCount={selectedCount} selectedHours={selectedHours}
                                onOptimize={onOptimize} 
                                tempDay={tempNonWorkingDay} setTempDay={setTempNonWorkingDay}
                                addDay={addNonWorkingDay} removeDay={removeNonWorkingDay}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const OptimizationPanel = ({ params, setParams, selectedCount, selectedHours, onOptimize, tempDay, setTempDay, addDay, removeDay } : any) => (
    <div>
        <h3 className="text-lg font-semibold mb-4">Panel de Optimización</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-700">{selectedCount}</p>
                <p className="text-sm text-blue-600">Centros Seleccionados</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-700">{selectedHours.toFixed(1)}</p>
                <p className="text-sm text-blue-600">Horas de Trabajo</p>
            </div>
        </div>
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-sm font-medium">Fecha de Inicio</label>
                    <input type="date" value={params.startDate} onChange={e => setParams({...params, startDate: e.target.value})} className="mt-1 block w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-sm"/>
                </div>
                 <div>
                    <label className="text-sm font-medium">Hora de Inicio</label>
                    <input type="time" value={params.startTime} onChange={e => setParams({...params, startTime: e.target.value})} className="mt-1 block w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-sm"/>
                </div>
            </div>
            <div>
                <label className="text-sm font-medium">Días no laborables (opcional)</label>
                <div className="flex gap-2 mt-1">
                    <input type="date" value={tempDay} onChange={e => setTempDay(e.target.value)} className="block w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-sm"/>
                    <button onClick={addDay} className="px-3 py-1.5 bg-slate-200 text-slate-700 text-sm rounded-md hover:bg-slate-300">Añadir</button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                    {params.nonWorkingDays.map((d: string) => (
                        <span key={d} className="bg-slate-100 text-xs text-slate-700 px-2 py-1 rounded-full flex items-center gap-1.5">
                            {d} <X onClick={() => removeDay(d)} className="w-3 h-3 cursor-pointer hover:text-red-500" />
                        </span>
                    ))}
                </div>
            </div>
             <div>
                <label className="text-sm font-medium">Horas máximas por día: {params.maxHoursPerDay}</label>
                <input type="range" min="4" max="12" step="0.5" value={params.maxHoursPerDay} onChange={e => setParams({...params, maxHoursPerDay: parseFloat(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-1" />
            </div>
             <div>
                <label className="text-sm font-medium">Estrategia Multi-Día</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                    <button onClick={() => setParams({...params, strategy: 'Volver al Origen'})} className={`px-3 py-1.5 rounded-md text-sm ${params.strategy === 'Volver al Origen' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>Volver al Origen</button>
                    <button onClick={() => setParams({...params, strategy: 'Ruta Continua'})} className={`px-3 py-1.5 rounded-md text-sm ${params.strategy === 'Ruta Continua' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>Ruta Continua</button>
                </div>
                <p className="text-xs text-slate-500 mt-1">{params.strategy === 'Volver al Origen' ? 'El técnico vuelve al punto de partida cada día.' : 'El técnico continúa desde la última ubicación.'}</p>
            </div>
        </div>
        <button onClick={onOptimize} disabled={selectedCount === 0} className="w-full mt-6 flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Waypoints className="mr-2 h-5 w-5" /> Optimizar {selectedCount} Centros
        </button>
    </div>
);

const DailyRouteLink = ({ day }: { day: DayPlan }) => {
    const generateMapsUrl = () => {
        // Filter for stops that are part of the actual route and have coordinates.
        const routeStops = day.paradas.filter(stop => 
            (stop.tipo === 'Inicio' || stop.tipo === 'Trabajo' || stop.tipo === 'Fin') &&
            stop.latitud && stop.longitud
        );

        if (routeStops.length === 0) return "#";
        
        // If only one point, link to it directly
        if (routeStops.length === 1) {
            return `https://www.google.com/maps?q=${routeStops[0].latitud},${routeStops[0].longitud}`;
        }

        const origin = `${routeStops[0].latitud},${routeStops[0].longitud}`;
        const destination = `${routeStops[routeStops.length - 1].latitud},${routeStops[routeStops.length - 1].longitud}`;
        
        const waypoints = routeStops
            .slice(1, -1) // Get all stops between origin and destination
            .map(stop => `${stop.latitud},${stop.longitud}`)
            .join('|');
        
        const baseUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
        
        return waypoints ? `${baseUrl}&waypoints=${waypoints}` : baseUrl;
    };
    
    return (
        <a href={generateMapsUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium">
            <MapIcon className="w-3.5 h-3.5" /> Ruta en Google Maps
        </a>
    );
};


const ResultsPanel = ({ result, onNewOptimization, startAddress, endAddress }: any) => {

    const downloadExcel = () => {
        const rows: any[] = [];
        result.plan_optimizado.forEach((day: DayPlan, dayIndex: number) => {
            const isFirstDay = dayIndex === 0;
            const isLastDay = dayIndex === result.plan_optimizado.length - 1;

            const inicioStop = day.paradas.find(s => s.tipo === 'Inicio');
            if (inicioStop) {
                 rows.push({
                    'Fecha': day.fecha, 'Día': day.dia_semana, 'Orden Visita': 'Inicio',
                    'Hora Inicio': inicioStop.hora_inicio, 'Hora Fin': inicioStop.hora_fin,
                    'Tiempo Viaje (hh:mm)': '', 'Distancia Viaje': '', 'Horas Trabajo (hh:mm)': '', 'Tiempo Espera (hh:mm)': '',
                    'Horario Apertura': '', 'Centro de Trabajo': 'Punto de Partida', 'Municipio': '', 'Provincia': '',
                    'Dirección': isFirstDay ? startAddress : inicioStop.nombre, // Use original startAddress for clarity on day 1
                    'Latitud': inicioStop.latitud, 'Longitud': inicioStop.longitud,
                    'Google Maps con hiperenlace': `https://www.google.com/maps?q=${inicioStop.latitud},${inicioStop.longitud}`
                });
            }

            let visitOrder = 1;
            day.paradas.forEach((stop, index) => {
                if (stop.tipo === 'Trabajo') {
                    const travelStop = day.paradas[index - 1];
                    // Check if the stop before travel was 'Espera'
                    const waitStop = (travelStop?.tipo === 'Viaje' && day.paradas[index-2]?.tipo === 'Espera') ? day.paradas[index-2] : null;

                    rows.push({
                        'Fecha': day.fecha, 'Día': day.dia_semana, 'Orden Visita': visitOrder++,
                        'Hora Inicio': stop.hora_inicio, 'Hora Fin': stop.hora_fin,
                        'Tiempo Viaje (hh:mm)': travelStop?.tipo === 'Viaje' ? travelStop.info_viaje?.duracion : '',
                        'Distancia Viaje': travelStop?.tipo === 'Viaje' ? travelStop.info_viaje?.distancia : '',
                        'Horas Trabajo (hh:mm)': stop.info_trabajo?.duracion || '',
                        'Tiempo Espera (hh:mm)': waitStop ? `${waitStop.hora_inicio} - ${waitStop.hora_fin}` : '',
                        'Horario Apertura': stop.horario_apertura || '', 'Centro de Trabajo': stop.nombre,
                        'Municipio': stop.municipio, 'Provincia': stop.provincia, 'Dirección': stop.direccion,
                        'Latitud': stop.latitud, 'Longitud': stop.longitud,
                        'Google Maps con hiperenlace': `https://www.google.com/maps?q=${stop.latitud},${stop.longitud}`
                    });
                }
            });

            const finStop = day.paradas.find(s => s.tipo === 'Fin');
            if (finStop) {
                const travelToFin = day.paradas[day.paradas.indexOf(finStop) - 1];
                rows.push({
                    'Fecha': day.fecha, 'Día': day.dia_semana, 'Orden Visita': 'Fin',
                    'Hora Inicio': finStop.hora_inicio, 'Hora Fin': finStop.hora_fin,
                    'Tiempo Viaje (hh:mm)': travelToFin?.tipo === 'Viaje' ? travelToFin.info_viaje?.duracion : '', 
                    'Distancia Viaje': travelToFin?.tipo === 'Viaje' ? travelToFin.info_viaje?.distancia : '', 
                    'Horas Trabajo (hh:mm)': '', 'Tiempo Espera (hh:mm)': '', 'Horario Apertura': '',
                    'Centro de Trabajo': 'Punto de Llegada', 'Municipio': '', 'Provincia': '',
                    'Dirección': isLastDay ? endAddress : finStop.nombre, // Use original endAddress for clarity on last day
                    'Latitud': finStop.latitud, 'Longitud': finStop.longitud,
                    'Google Maps con hiperenlace': `https://www.google.com/maps?q=${finStop.latitud},${finStop.longitud}`
                });
            }
        });

        const header = [
            'Fecha', 'Día', 'Orden Visita', 'Hora Inicio', 'Hora Fin', 'Tiempo Viaje (hh:mm)',
            'Distancia Viaje', 'Horas Trabajo (hh:mm)', 'Tiempo Espera (hh:mm)', 'Horario Apertura', 'Centro de Trabajo',
            'Municipio', 'Provincia', 'Dirección', 'Latitud', 'Longitud', 'Google Maps con hiperenlace'
        ];
        
        const worksheet = xlsx.utils.json_to_sheet(rows, { header });

        rows.forEach((row, index) => {
            const cellAddress = `Q${index + 2}`; // Column P -> Q
            const url = row['Google Maps con hiperenlace'];
            if (worksheet[cellAddress] && url) {
                worksheet[cellAddress].l = { Target: url, Tooltip: "Abrir en Google Maps" };
                worksheet[cellAddress].s = { font: { color: { rgb: "0563C1" }, underline: true } };
            }
        });
        
        worksheet['!cols'] = header.map(h => ({ wch: h.length < 15 ? 15 : h.length + 2 }));

        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Ruta Optimizada');
        xlsx.writeFile(workbook, 'XpertRadon_RutaOptimizada.xlsx');
    };

    const downloadICal = () => {
        const formatICalDate = (dateStr: string, timeStr: string) => {
            const [year, month, day] = dateStr.split('-');
            const [hours, minutes] = timeStr.split(':');
            return `${year}${month}${day}T${hours}${minutes}00`;
        };

        let icsContent = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//XpertRadon//RouteOptimizer//ES', 'CALSCALE:GREGORIAN'
        ];

        result.plan_optimizado.forEach((day: DayPlan) => {
            day.paradas.forEach((stop: Stop) => {
                if (stop.tipo === 'Trabajo') {
                    const descriptionParts = [
                        `Visita de trabajo a ${stop.nombre}.`,
                        `Duración estimada: ${stop.info_trabajo?.duracion || 'N/A'}.`,
                        `Detectores a instalar: ${stop.total_detectores ?? 'No especificado'}.`,
                        `Horario del centro: ${stop.horario_apertura || 'N/A'}`,
                        '',
                        `Ver en mapa: https://www.google.com/maps?q=${stop.latitud},${stop.longitud}`
                    ];
                    
                    icsContent.push(
                        'BEGIN:VEVENT',
                        `UID:${day.fecha}-${stop.nombre.replace(/[^a-zA-Z0-9]/g, "")}@xpertradon.com`,
                        `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '')}Z`,
                        `DTSTART:${formatICalDate(day.fecha, stop.hora_inicio)}`,
                        `DTEND:${formatICalDate(day.fecha, stop.hora_fin)}`,
                        `SUMMARY:${stop.nombre}`,
                        `LOCATION:${stop.direccion}, ${stop.municipio}, ${stop.provincia}`,
                        `DESCRIPTION:${descriptionParts.join('\\n')}`,
                        'END:VEVENT'
                    );
                } else if (stop.tipo === 'Espera') {
                    const descriptionParts = [
                        `Tiempo de espera programado antes de la visita a ${stop.nombre}.`,
                        `La visita comenzará a las ${day.paradas.find(s => s.nombre === stop.nombre && s.tipo === 'Trabajo')?.hora_inicio || 'N/A'}`
                    ];
                    icsContent.push(
                        'BEGIN:VEVENT',
                        `UID:${day.fecha}-${stop.nombre.replace(/[^a-zA-Z0-9]/g, "")}-wait@xpertradon.com`,
                        `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '')}Z`,
                        `DTSTART:${formatICalDate(day.fecha, stop.hora_inicio)}`,
                        `DTEND:${formatICalDate(day.fecha, stop.hora_fin)}`,
                        `SUMMARY:Espera - ${stop.nombre}`,
                        `LOCATION:${stop.direccion}, ${stop.municipio}, ${stop.provincia}`,
                        `DESCRIPTION:${descriptionParts.join('\\n')}`,
                        'TRANSP:TRANSPARENT', // Mark as free time
                        'END:VEVENT'
                    );
                }
            });
        });
        icsContent.push('END:VCALENDAR');

        const icsFile = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(icsFile);
        link.download = 'XpertRadon_Ruta.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };


    const getDotClass = (type: Stop['tipo']) => {
        switch (type) {
            case 'Inicio': return 'bg-green-500';
            case 'Fin': return 'bg-red-500';
            case 'Trabajo': return 'bg-blue-500 border-4 border-white';
            case 'Espera': return 'bg-amber-400';
            default: return 'bg-slate-300';
        }
    };
    
    const getIcon = (type: Stop['tipo']) => {
      switch(type) {
        case 'Trabajo': return <Briefcase className="w-3 h-3 text-white" />;
        case 'Viaje': return <MapIcon className="w-3 h-3" />;
        case 'Espera': return <Clock4 className="w-3 h-3 text-white" />;
        default: return null;
      }
    }

    return (
        <div>
            <h3 className="text-lg font-semibold mb-2">Resultados de la Optimización</h3>
            <div className="flex gap-2 mb-4">
                <button onClick={downloadExcel} className="flex-1 text-sm bg-slate-100 hover:bg-slate-200 py-1.5 px-3 rounded-md flex items-center justify-center gap-2"><FileDown className="w-4 h-4" /> Excel</button>
                <button onClick={downloadICal} className="flex-1 text-sm bg-slate-100 hover:bg-slate-200 py-1.5 px-3 rounded-md flex items-center justify-center gap-2"><CalendarDays className="w-4 h-4" /> iCal</button>
            </div>
            <button onClick={onNewOptimization} className="w-full bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium py-2 rounded-md mb-4">
                Nueva Optimización
            </button>

            <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-2">
                {result.plan_optimizado.map((day: DayPlan, dayIndex: number) => (
                    <div key={dayIndex}>
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="font-bold text-slate-800">Día {dayIndex + 1} ({day.resumen_dia})</h4>
                            <DailyRouteLink day={day} />
                        </div>
                        <p className="text-sm text-slate-500 mb-2">{day.dia_semana}, {new Date(day.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                        <div className="relative border-l-2 border-blue-200 pl-6 space-y-1">
                            {day.paradas.map((stop: Stop, stopIndex: number) => (
                                <div key={stopIndex} className={`relative ${stopIndex === day.paradas.length - 1 ? 'pb-0' : 'pb-4'}`}>
                                    <div className={`absolute -left-[29.5px] top-1.5 w-[18px] h-[18px] rounded-full flex items-center justify-center ${getDotClass(stop.tipo)}`}>
                                      {getIcon(stop.tipo)}
                                    </div>
                                    <div className="p-3 rounded-md bg-white border border-slate-200">
                                        <p className="font-semibold text-slate-700 text-sm">{stop.nombre}</p>
                                        <p className="text-xs text-slate-500">{stop.direccion}</p>
                                        <p className="font-mono text-xs text-blue-600 font-medium py-0.5 mt-1">{stop.hora_inicio} - {stop.hora_fin}</p>
                                        <div className="text-xs text-slate-500 flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 pt-1 border-t border-slate-100">
                                          {stop.info_trabajo && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3"/> Trabajo: {stop.info_trabajo.duracion}</span>}
                                          {stop.info_viaje && <span className="flex items-center gap-1"><MapIcon className="w-3 h-3"/> Viaje: {stop.info_viaje.duracion} ({stop.info_viaje.distancia})</span>}
                                          {stop.tipo === 'Espera' && <span className="flex items-center gap-1"><Clock4 className="w-3 h-3"/> Espera en ubicación</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {result.centros_no_asignados.length > 0 && (
                    <div>
                        <h4 className="font-bold text-red-600 mt-6">Centros No Asignados</h4>
                        <div className="mt-2 space-y-2">
                            {result.centros_no_asignados.map((c: UnassignedCenter, i: number) => (
                                <div key={i} className="bg-red-50 p-2 rounded-md border border-red-100">
                                    <p className="font-semibold text-sm text-red-800">{c.nombre}</p>
                                    <p className="text-xs text-slate-600">{c.direccion}</p>
                                    <p className="text-xs text-red-700 mt-1"><b>Motivo:</b> {c.motivo}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const EditCenterModal = ({ center, onSave, onCancel }: { center: WorkCenter, onSave: (center: WorkCenter) => void, onCancel: () => void }) => {
    const [formData, setFormData] = useState<WorkCenter>(center);

    useEffect(() => {
        setFormData(center);
    }, [center]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isNumber = type === 'number';
        setFormData(prev => ({
            ...prev,
            [name]: isNumber ? (value === '' ? '' : parseFloat(value)) : value
        }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-30 flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-800">Editar Centro de Trabajo</h2>
                    <button onClick={onCancel} className="p-1 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <form onSubmit={handleSubmit} className="overflow-y-auto">
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label htmlFor="nombre" className="block text-sm font-medium text-slate-700">Nombre del Centro</label>
                            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="mt-1 form-input" required />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="direccion" className="block text-sm font-medium text-slate-700">Dirección</label>
                            <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="mt-1 form-input" required />
                        </div>
                        <div>
                            <label htmlFor="municipio" className="block text-sm font-medium text-slate-700">Municipio</label>
                            <input type="text" name="municipio" value={formData.municipio} onChange={handleChange} className="mt-1 form-input" required />
                        </div>
                         <div>
                            <label htmlFor="provincia" className="block text-sm font-medium text-slate-700">Provincia</label>
                            <input type="text" name="provincia" value={formData.provincia || ''} onChange={handleChange} className="mt-1 form-input" />
                        </div>
                         <div>
                            <label htmlFor="latitud" className="block text-sm font-medium text-slate-700">Latitud</label>
                            <input type="number" name="latitud" value={formData.latitud || ''} onChange={handleChange} step="any" className="mt-1 form-input" />
                        </div>
                         <div>
                            <label htmlFor="longitud" className="block text-sm font-medium text-slate-700">Longitud</label>
                            <input type="number" name="longitud" value={formData.longitud || ''} onChange={handleChange} step="any" className="mt-1 form-input" />
                        </div>
                        <div>
                            <label htmlFor="horasTrabajo" className="block text-sm font-medium text-slate-700">Horas de Trabajo</label>
                            <input type="number" name="horasTrabajo" value={formData.horasTrabajo} onChange={handleChange} className="mt-1 form-input" step="0.1" required />
                        </div>
                        <div>
                            <label htmlFor="totalDetectores" className="block text-sm font-medium text-slate-700">Total de Detectores</label>
                            <input type="number" name="totalDetectores" value={formData.totalDetectores} onChange={handleChange} className="mt-1 form-input" required />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="horarioGeneral" className="block text-sm font-medium text-slate-700">Horario General</label>
                            <input type="text" name="horarioGeneral" placeholder="Ej: 09:00-14:00, 16:00-19:00" value={formData.horarioGeneral || ''} onChange={handleChange} className="mt-1 form-input" />
                        </div>
                        <div>
                            <label htmlFor="horarioLunes" className="block text-sm font-medium text-slate-700">Horario Lunes</label>
                            <input type="text" name="horarioLunes" value={formData.horarioLunes || ''} onChange={handleChange} className="mt-1 form-input" />
                        </div>
                         <div>
                            <label htmlFor="horarioMartes" className="block text-sm font-medium text-slate-700">Horario Martes</label>
                            <input type="text" name="horarioMartes" value={formData.horarioMartes || ''} onChange={handleChange} className="mt-1 form-input" />
                        </div>
                         <div>
                            <label htmlFor="horarioMiercoles" className="block text-sm font-medium text-slate-700">Horario Miércoles</label>
                            <input type="text" name="horarioMiercoles" value={formData.horarioMiercoles || ''} onChange={handleChange} className="mt-1 form-input" />
                        </div>
                         <div>
                            <label htmlFor="horarioJueves" className="block text-sm font-medium text-slate-700">Horario Jueves</label>
                            <input type="text" name="horarioJueves" value={formData.horarioJueves || ''} onChange={handleChange} className="mt-1 form-input" />
                        </div>
                         <div>
                            <label htmlFor="horarioViernes" className="block text-sm font-medium text-slate-700">Horario Viernes</label>
                            <input type="text" name="horarioViernes" value={formData.horarioViernes || ''} onChange={handleChange} className="mt-1 form-input" />
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-50">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);