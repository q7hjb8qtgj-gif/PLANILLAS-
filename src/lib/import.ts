import ExcelJS from 'exceljs'

export interface ImportedSheet { name: string; headers: string[]; rows: Record<string, unknown>[] }

export async function readWorkbook(file: File): Promise<ImportedSheet[]> {
  const workbook = new ExcelJS.Workbook()
  if (file.name.toLowerCase().endsWith('.csv')) {
    const worksheet = await workbook.csv.read(await file.arrayBuffer())
    return [toImported(worksheet)]
  }
  if (file.name.toLowerCase().endsWith('.xls')) throw new Error('El formato XLS legado debe guardarse como XLSX o CSV antes de importarlo.')
  await workbook.xlsx.load(await file.arrayBuffer())
  return workbook.worksheets.map(toImported)
}
function toImported(worksheet: ExcelJS.Worksheet): ImportedSheet {
  const headers = (worksheet.getRow(1).values as unknown[]).slice(1).map((value) => String(value ?? '').trim())
  const rows: Record<string, unknown>[] = []
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const values = row.values as unknown[]
    const record: Record<string, unknown> = { __row: rowNumber }
    headers.forEach((header, index) => { record[header] = values[index + 1] ?? '' })
    if (Object.entries(record).some(([key, value]) => key !== '__row' && value !== '')) rows.push(record)
  })
  return { name: worksheet.name, headers, rows }
}
