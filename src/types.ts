export type Role = 'administrador' | 'validador' | 'digitador' | 'consulta' | 'encargado_area'
export type PayrollStatus = 'Borrador' | 'Pendiente de revisión' | 'Observada' | 'Corregida' | 'Aprobada' | 'Rechazada' | 'Pagada' | 'Anulada'
export type PayrollType = 'Ordinaria' | 'Extraordinaria' | 'Obra complementaria' | 'Bono' | 'Ajuste' | 'Otro'
export type Severity = 'Crítico' | 'Alto' | 'Medio' | 'Informativo'

export interface UserSession { id: string; name: string; role: Role; areaId?: string }
export interface CatalogItem { id: string; name: string; active: boolean; companyId?: string; areaId?: string }
export interface Employee {
  id: string; code: string; fullName: string; dpi?: string; nit?: string; companyId: string; areaId: string
  position: string; contractType: string; bankAccount?: string; paymentMethod: string; baseRate: number
  active: boolean; startDate: string; notes?: string
}
export interface PayrollItem {
  id: string; employeeId: string; employeeCode: string; employeeName: string; companyId: string; areaId: string
  position: string; daysWorked: number; regularHours: number; overtimeHours: number; rate: number
  regularSalary: number; overtimePay: number; workPay: number; bonus: number; commissions: number; otherIncome: number
  igss: number; advances: number; loans: number; otherDeductions: number; totalIncome: number; totalDeductions: number
  netPay: number; paymentMethod: string; reference?: string; notes?: string; supportDocument?: string
  validationStatus: string; sourceFile?: string; sourceRow?: number
}
export interface CooperativeSettings {
  enabled: boolean; commissionRate: number; vatRate: number
}
export interface Payroll {
  id: string; code: string; companyId: string; areaId: string; startDate: string; endDate: string
  week: number; year: number; type: PayrollType; status: PayrollStatus; digitizer: string; reviewer: string
  notes?: string; items: PayrollItem[]; cooperative: CooperativeSettings; approvals: Approval[]
  createdAt: string; updatedAt: string; voidedAt?: string
}
export interface Finding {
  id: string; payrollId: string; itemId?: string; severity: Severity; employeeName?: string; rule: string
  affectedAmount: number; description: string; recommendation: string; status: 'Pendiente' | 'En corrección' | 'Resuelto' | 'Aceptado'
  assignedTo?: string; evidence?: string; resolvedAt?: string; createdAt: string
}
export interface Approval {
  id: string; step: string; action: string; userName: string; comment?: string; createdAt: string
}
export interface Attachment {
  id: string; payrollId?: string; name: string; type: string; size: number; storagePath?: string; createdAt: string
}
export interface AuditLog {
  id: string; userName: string; action: string; module: string; recordId: string; before: unknown; after: unknown
  reason?: string; relatedDocument?: string; ip?: string; createdAt: string
}
export interface AppData {
  companies: CatalogItem[]; areas: CatalogItem[]; costCenters: CatalogItem[]; positions: CatalogItem[]
  workTypes: CatalogItem[]; projects: CatalogItem[]; payrollTypes: CatalogItem[]
  employees: Employee[]; payrolls: Payroll[]; findings: Finding[]; attachments: Attachment[]; auditLogs: AuditLog[]
}
