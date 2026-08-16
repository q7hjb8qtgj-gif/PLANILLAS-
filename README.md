# Sistema de Control y Verificación de Planillas – Corporación Riso

Aplicación web responsive para registrar, importar, conciliar, validar, autorizar y reportar planillas semanales. La instalación comienza sin colaboradores, planillas, pagos ni hallazgos. Solo procesa información ingresada o importada por usuarios.

## Funciones

- Autenticación con Supabase y modo local explícito cuando no hay variables configuradas.
- Roles: Administrador, Validador, Digitador, Consulta y Encargado de área.
- Catálogos editables de empresas, áreas, centros de costo, puestos, tipos y proyectos.
- Registro de colaboradores con detección de código, DPI, NIT o nombre repetido.
- Planillas y detalle editable, cálculos automáticos, cooperativa, validaciones y autorización.
- Importación XLSX/XLS/CSV con selección de hoja, mapeo, vista previa y errores por fila.
- Conciliación ordinaria contra extraordinaria.
- Excel con hojas `Resumen`, `Detalle` y `Hallazgos`; PDF con totales y firmas.
- Evidencias, anulación sin borrado y bitácora inmutable desde la interfaz.
- Diseño mobile-first para iPhone, tablas desplazables y captura de cámara.

## Requisitos

- Node.js 22 o superior.
- npm 10 o superior.
- Proyecto Supabase para persistencia compartida en producción.

## Instalación

```bash
npm install
cp .env.example .env.local
npm run dev
```

Sin variables de Supabase, la aplicación funciona en **modo local** con `localStorage`; la sesión se conserva en `sessionStorage`. Este modo sirve para evaluación o trabajo individual y no reemplaza la base compartida, RLS ni Storage de producción.

## Supabase

1. Cree un proyecto vacío.
2. Ejecute `supabase/migrations/202608160001_initial_schema.sql` con Supabase CLI o SQL Editor.
3. Cree el primer perfil y rol Administrador de forma controlada desde el panel; la migración no inserta usuarios ni información operativa.
4. Copie la URL y la clave pública `anon`/publishable a `.env.local`.
5. Nunca exponga la clave `service_role` en variables `VITE_*`.

La migración crea tablas, relaciones, índices, restricciones, RLS, políticas por rol/ámbito, bitácora automática, protección de planillas pagadas y un bucket privado con tipos y tamaño limitados.

## Comandos de calidad

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Estructura

```text
src/
  components/       componentes UI estilo shadcn y navegación
  context/          sesión y repositorio local auditable
  lib/              cálculos, validación, exportación, Supabase y almacenamiento
  pages/            módulos funcionales y página 404
  types.ts          modelo TypeScript
supabase/migrations/ esquema PostgreSQL, RLS y auditoría
```

## Flujo recomendado

1. Configure empresas, áreas y catálogos.
2. Registre colaboradores reales.
3. Cree una planilla o importe su detalle.
4. Ejecute el motor de validación y resuelva hallazgos.
5. Envíe a revisión. Una planilla no puede aprobarse con hallazgos críticos abiertos.
6. Registre la validación primaria de Luis Rivas, la firma secundaria y la aprobación.
7. Exporte los reportes y, después de efectuar el pago, marque la planilla como pagada.

Las acciones de rechazo, devolución y anulación exigen motivo. Los registros se desactivan o anulan; no se eliminan desde la aplicación.

## Despliegue en Vercel

1. Importe el repositorio en Vercel.
2. Use `npm run build` y el directorio de salida `dist`.
3. Configure `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Agregue el dominio de Vercel a las URL permitidas de Supabase Auth.
5. Configure la reescritura SPA incluida en `vercel.json`.

## Formatos

- Moneda: quetzales (`Q0.00`).
- Fechas visibles: `DD/MM/AAAA`.
- Zona horaria: `America/Guatemala`.
- Excel: filtros, encabezados congelados, fórmulas y trazabilidad de archivo/fila.
