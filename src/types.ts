export type Role = 'Administrador' | 'Validador' | 'Digitador' | 'Consulta' | 'Encargado de área'
export type PayrollType = 'Ordinaria' | 'Extraordinaria' | 'Obra complementaria' | 'Bono' | 'Ajuste' | 'Otro'
export type PayrollStatus = 'Borrador' | 'Pendiente de revisión' | 'Observada' | 'Corregida' | 'Aprobada' | 'Rechazada' | 'Pagada' | 'Anulada'
export type Severity = 'Crítico' | 'Alto' | 'Medio' | 'Informativo'

export interface BaseRecord { id: string; createdAt: string; updatedAt: string; active: boolean }
export interface UserSession { id: string; name: string; email: string; role: Role; areaId?: string }
export interface Company extends BaseRecord { name: string; taxId?: string }
export interface Area extends BaseRecord { name: string; companyId: string }
export interface CatalogItem extends BaseRecord { name: string; kind: 'Centro de costo' | 'Puesto' | 'Tipo de trabajo' | 'Proyecto' | 'Tipo de planilla' }
export interface Employee extends BaseRecord {
  code: string; fullName: string; dpi?: string; nit?: string; companyId: string; areaId: string
  position: string; contractType: string; bankAccount?: string; paymentMethod: string; baseRate: number
  admissionDate: string; notes?: string
}
export interface PayrollItem {
  id: string; employeeId: string; code: string; companyId: string; areaId: string; position: string
  daysWorked: number; regularHours: number; overtimeHours: number; rate: number; regularSalary: number
  overtimePay: number; workPay: number; bonus: number; commissions: number; otherIncome: number
  igss: number; advances: number; loans: number; otherDeductions: number; totalIncome: number
  totalDeductions: number; netPay: number; paymentMethod: string; reference?: string; notes?: string
  supportDocument?: string; validationStatus: string; sourceFile?: string; sourceRow?: number
}
export interface CooperativeSettings { enabled: boolean; baseAmount: number; commissionRate: number; vatRate: number }
export interface Payroll extends BaseRecord {
  code: string; companyId: string; areaId: string; startDate: string; endDate: string; week: number
  year: number; type: PayrollType; status: PayrollStatus; dataEntryResponsible: string
  reviewer?: string; notes?: string; items: PayrollItem[]; cooperative: CooperativeSettings
  approvedByLuisRivas: boolean; secondarySigner?: string; headerTotal?: number
}
export interface Finding extends BaseRecord {
  payrollId: string; employeeId?: string; severity: Severity; rule: string; affectedAmount: number
  description: string; recommendation: string; status: 'Abierto' | 'En corrección' | 'Resuelto' | 'Aceptado con excepción'
  assignee?: string; evidence?: string; resolvedAt?: string
}
export interface Attachment extends BaseRecord {
  payrollId?: string; name: string; type: string; size: number; category: string; dataUrl?: string
}
export interface AuditLog {
  id: string; userId: string; userName: string; action: string; module: string; recordId: string
  oldValue?: unknown; newValue?: unknown; timestamp: string; reason?: string; documentId?: string
}
export interface AppData {
  companies: Company[]; areas: Area[]; catalog: CatalogItem[]; employees: Employee[]
  payrolls: Payroll[]; findings: Finding[]; attachments: Attachment[]; auditLogs: AuditLog[]
}
