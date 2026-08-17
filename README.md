# Sistema de Control y Verificación de Planillas – Corporación Riso

Aplicación web para registrar, importar, conciliar, validar, autorizar y reportar planillas semanales. La instalación inicia sin colaboradores, pagos ni cifras de demostración.

## Tecnología

React 19, TypeScript, Vite, Tailwind CSS, componentes estilo shadcn/ui, React Hook Form, Zod, TanStack Query, Recharts, ExcelJS, jsPDF, Supabase y PostgreSQL.

## Instalación

Requisitos: Node.js 22 o superior y npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Comprobaciones:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Persistencia

### Modo local

Si las variables de Supabase están vacías, la aplicación usa `localStorage` para datos y mantiene la sesión únicamente en memoria. Este modo es funcional y está aislado en `src/lib/store.ts`. Es apropiado para evaluación local, no para compartir datos entre equipos ni para producción.

### Supabase

1. Cree un proyecto de Supabase.
2. Ejecute `supabase/migrations/202608160001_initial_schema.sql` desde Supabase CLI o SQL Editor.
3. Cree el primer usuario en Supabase Auth y asigne su perfil y rol administrador mediante SQL seguro en el panel.
4. Copie la URL y la clave pública `anon` a `.env`; nunca use la clave `service_role` en el frontend.
5. Configure los usuarios y catálogos desde la aplicación. La migración no inserta empleados, empresas, salarios ni pagos.

La migración contiene llaves foráneas, índices, restricciones, borrado lógico, RLS por rol/empresa/área, auditoría automática y un bucket privado de evidencias con límite de 10 MB.

> La interfaz actual mantiene el adaptador local como fallback. Para una operación multiusuario, conecte las operaciones de `src/lib/store.ts` a las tablas tipadas de Supabase conservando el mismo contrato `AppData`.

## Flujo de uso

1. Configure empresas, áreas y demás catálogos.
2. Registre colaboradores.
3. Cree un período y su planilla.
4. Agregue detalle manualmente o importe XLSX/CSV con mapeo. Los archivos XLS heredados deben guardarse como XLSX o CSV.
5. Ejecute validaciones y resuelva hallazgos con evidencia.
6. Concilie ordinaria contra extraordinaria.
7. Complete el flujo de revisión y autorización. La aprobación primaria identifica a Luis Rivas.
8. Exporte Excel (Resumen, Detalle y Hallazgos cuando aplique) o PDF con firmas.

Todas las fechas visibles usan formato DD/MM/AAAA, los importes se presentan en quetzales y los registros temporales usan la zona `America/Guatemala`.

## Estructura

```text
src/
  components/ui.tsx       Componentes reutilizables estilo shadcn/ui
  lib/calculations.ts     Cálculos monetarios y cooperativa
  lib/validation.ts       Motor de hallazgos
  lib/import.ts           Lectura y vista previa de archivos
  lib/export.ts           Reportes Excel y PDF
  lib/store.ts            Adaptador de persistencia local
  lib/supabase.ts         Cliente opcional de Supabase
  App.tsx                 Módulos y flujo responsive
supabase/migrations/      Esquema PostgreSQL, RLS y auditoría
```

## Despliegue en Vercel

1. Importe el repositorio en Vercel.
2. Use `npm run build` y el directorio de salida `dist`.
3. Defina `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en los entornos requeridos.
4. Despliegue. `vercel.json` incluye fallback para SPA y encabezados básicos de seguridad.

Antes de producción, pruebe RLS con cada rol, configure recuperación de cuenta y MFA según las políticas de la organización, y establezca copias de seguridad y retención en Supabase.
