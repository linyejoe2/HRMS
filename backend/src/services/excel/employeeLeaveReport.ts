import ExcelJS from 'exceljs';
import { readFile } from 'fs/promises';
import path from 'path';
import legacyLeave from '../../config/legacyLeave.json';
import { Employee, IEmployee, Leave } from '../../models';
import { APIError } from '../../middleware';
import { LeaveService } from '../leaveService';
import { ReturnTaiwanLeaveService } from '../returnTaiwanLeaveService';
import { dayjsTz, dayjsToTz } from '../../util/utility';

const STANDARD_TEMPLATE_PATH = path.resolve(__dirname, '../../../assets/report-templates/employee-leave-report.xlsx');
const RETURN_TAIWAN_TEMPLATE_PATH = path.resolve(__dirname, '../../../assets/report-templates/employee-leave-report-with-return-taiwan.xlsx');
const WORKSHEET_NAME = '請假表';
const PREVIOUS_YEAR_DETAIL_START = 7;
const PREVIOUS_YEAR_TEMPLATE_DETAIL_END = 18;
const PREVIOUS_YEAR_TOTAL_ROW = 19;
const CURRENT_YEAR_TEMPLATE_DETAIL_START = 26;
const CURRENT_YEAR_TEMPLATE_DETAIL_END = 38;
const CURRENT_YEAR_TOTAL_ROW = 39;
const TEMPLATE_LAST_ROW = 40;
const PREVIOUS_YEAR_CAPACITY = PREVIOUS_YEAR_TEMPLATE_DETAIL_END - PREVIOUS_YEAR_DETAIL_START + 1;
const CURRENT_YEAR_CAPACITY = CURRENT_YEAR_TEMPLATE_DETAIL_END - CURRENT_YEAR_TEMPLATE_DETAIL_START + 1;

type LeaveReportRow = {
  leaveStart: Date;
  leaveEnd: Date;
  leaveType: string;
  duration: number;
  reason: string;
};

type ReportColumns = {
  lastColumn: string;
  inputColumns: string[];
  totalColumns: string[];
  leaveTypes: Record<string, string>;
  specialLeave: string;
  accumulatedSpecialLeave: string;
  remainingSpecialLeave: string;
  returnTaiwanLeave?: string;
  accumulatedReturnTaiwanLeave?: string;
  remainingReturnTaiwanLeave?: string;
  note: string;
};

type ReportConfig = {
  templatePath: string;
  columns: ReportColumns;
};

type YearBlockLayout = {
  empIDCell: string;
  departmentCell: string;
  periodCell: string;
  nameCell: string;
  annualLeaveDaysCell?: string;
  annualLeaveHoursCell: string;
  returnTaiwanHoursCell?: string;
  detailStartRow: number;
  detailEndRow: number;
  totalRow: number;
  openingRow?: number;
};

const STANDARD_COLUMNS: ReportColumns = {
  lastColumn: 'R',
  inputColumns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'R'],
  totalColumns: ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'],
  leaveTypes: {
    '普通傷病假': 'C',
    '事假': 'D',
    '婚假': 'E',
    '喪假': 'F',
    '生理假': 'G',
    '公假': 'H',
    '公傷病假': 'I',
    '產假': 'J',
    '產檢假': 'K',
    '陪產檢及陪產假': 'L',
    '安胎休養請假': 'M',
    '育嬰留職停薪': 'N',
    '特別休假': 'O'
  },
  specialLeave: 'O',
  accumulatedSpecialLeave: 'P',
  remainingSpecialLeave: 'Q',
  note: 'R'
};

const RETURN_TAIWAN_COLUMNS: ReportColumns = {
  lastColumn: 'U',
  inputColumns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'R', 'U'],
  totalColumns: ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'R'],
  leaveTypes: {
    '普通傷病假': 'C',
    '事假': 'D',
    '婚假': 'E',
    '喪假': 'F',
    '生理假': 'G',
    '公假': 'H',
    '公傷病假': 'I',
    '產假': 'J',
    '產檢假': 'K',
    '陪產檢及陪產假': 'L',
    '安胎休養請假': 'M',
    '育嬰留職停薪': 'N',
    '返台假': 'O',
    '特別休假': 'R'
  },
  specialLeave: 'R',
  accumulatedSpecialLeave: 'S',
  remainingSpecialLeave: 'T',
  returnTaiwanLeave: 'O',
  accumulatedReturnTaiwanLeave: 'P',
  remainingReturnTaiwanLeave: 'Q',
  note: 'U'
};

const leaveDuration = (hour: string, minutes: string): number => Number(hour) + Number(minutes) / 60;

export const generateEmployeeLeaveReport = async (empID: string, startDate: string, endDate: string): Promise<ExcelJS.Buffer> => {
  const employee = await Employee.findOne({ empID });
  if (!employee) {
    throw new APIError('Employee not found', 404);
  }

  const start = dayjsTz(startDate).startOf('day');
  const end = dayjsTz(endDate).endOf('day');
  const hasReturnTaiwanLeave = await ReturnTaiwanLeaveService.isEligible(employee);
  const config: ReportConfig = hasReturnTaiwanLeave
    ? { templatePath: RETURN_TAIWAN_TEMPLATE_PATH, columns: RETURN_TAIWAN_COLUMNS }
    : { templatePath: STANDARD_TEMPLATE_PATH, columns: STANDARD_COLUMNS };

  const leaves = await Leave.find({
    empID,
    status: 'approved',
    $or: [
      { leaveStart: { $gte: start.toDate(), $lte: end.toDate() } },
      { leaveEnd: { $gte: start.toDate(), $lte: end.toDate() } },
      { leaveStart: { $lte: start.toDate() }, leaveEnd: { $gte: end.toDate() } }
    ]
  }).sort({ sequenceNumber: 1 });

  const remain = legacyLeave.find(leave => leave.id === employee.empID)?.remain || 0;
  const annualLeaveDays = await LeaveService.calcAnnualLeaveDaysByEmployee(employee, end.month(11).date(23).endOf('day'));
  const yearRange = LeaveService.getYearRanges(dayjsTz(employee.hireDate), end);
  const annualLeaveUsed = annualLeaveDays[1] - remain;
  const returnTaiwanBalances = hasReturnTaiwanLeave
    ? await Promise.all([
      ReturnTaiwanLeaveService.getBalance(employee, yearRange.lastYearStart),
      ReturnTaiwanLeaveService.getBalance(employee, yearRange.thisYearStart)
    ])
    : undefined;
  const reportData: LeaveReportRow[] = leaves.map(leave => ({
    leaveStart: new Date(leave.leaveStart),
    leaveEnd: new Date(leave.leaveEnd),
    leaveType: leave.leaveType,
    duration: leaveDuration(leave.hour, leave.minutes),
    reason: leave.reason || ''
  }));

  return formatOutput(reportData, {
    employee,
    annualLeaveDays,
    annualLeaveUsed,
    returnTaiwanBalances,
    yearRange,
    year: start.year()
  }, config);
};

const formatOutput = async (
  reportData: LeaveReportRow[],
  metadata: {
    employee: IEmployee;
    annualLeaveDays: number[];
    annualLeaveUsed: number;
    returnTaiwanBalances?: Awaited<ReturnType<typeof ReturnTaiwanLeaveService.getBalance>>[];
    yearRange: ReturnType<typeof LeaveService.getYearRanges>;
    year: number;
  },
  config: ReportConfig
): Promise<ExcelJS.Buffer> => {
  const workbook = new ExcelJS.Workbook();

  try {
    const template = await readFile(config.templatePath);
    await workbook.xlsx.load(template.buffer.slice(template.byteOffset, template.byteOffset + template.byteLength) as ArrayBuffer);
  } catch {
    throw new APIError('請假表範本不存在或無法讀取', 500);
  }

  const worksheet = workbook.getWorksheet(WORKSHEET_NAME);
  if (!worksheet) {
    throw new APIError(`請假表範本缺少工作表：${WORKSHEET_NAME}`, 500);
  }

  trimTemplateRows(worksheet);
  const previousYearRows: LeaveReportRow[] = [];
  const currentYearRows: LeaveReportRow[] = [];

  for (const row of reportData) {
    if (dayjsToTz(row.leaveStart).isBefore(metadata.yearRange.lastYearEnd)) {
      previousYearRows.push(row);
    } else {
      currentYearRows.push(row);
    }
  }

  const layouts = expandDetailRows(worksheet, previousYearRows.length, currentYearRows.length, config.columns);
  setMetadata(worksheet, metadata, layouts, config.columns);
  clearTemplateDetails(worksheet, layouts.previousYear, config.columns);
  clearTemplateDetails(worksheet, layouts.currentYear, config.columns);
  writeYearRows(worksheet, previousYearRows, layouts.previousYear, config.columns);
  writeYearRows(worksheet, currentYearRows, layouts.currentYear, config.columns);
  setBlockFooter(worksheet, layouts.previousYear, config.columns);
  setBlockFooter(worksheet, layouts.currentYear, config.columns);
  worksheet.pageSetup.printArea = `A1:${config.columns.lastColumn}${layouts.currentYear.totalRow}`;

  return workbook.xlsx.writeBuffer();
};

const trimTemplateRows = (worksheet: ExcelJS.Worksheet): void => {
  const rows = (worksheet as ExcelJS.Worksheet & { _rows: Array<ExcelJS.Row | undefined> })._rows;
  rows.length = TEMPLATE_LAST_ROW;
};

const expandDetailRows = (
  worksheet: ExcelJS.Worksheet,
  previousYearCount: number,
  currentYearCount: number,
  columns: ReportColumns
): { previousYear: YearBlockLayout; currentYear: YearBlockLayout } => {
  const previousOverflow = Math.max(0, previousYearCount - PREVIOUS_YEAR_CAPACITY);
  const currentOverflow = Math.max(0, currentYearCount - CURRENT_YEAR_CAPACITY);
  const mergeRanges = [...worksheet.model.merges];
  mergeRanges.forEach(range => worksheet.unMergeCells(range));
  insertDetailRows(worksheet, PREVIOUS_YEAR_TOTAL_ROW, previousOverflow, columns);
  insertDetailRows(worksheet, CURRENT_YEAR_TOTAL_ROW + previousOverflow, currentOverflow, columns);
  restoreMergedCells(worksheet, mergeRanges, previousOverflow, currentOverflow);

  const hasReturnTaiwanLeave = Boolean(columns.returnTaiwanLeave);
  const currentYearMetadataRow = (hasReturnTaiwanLeave ? 22 : 21) + previousOverflow;
  const currentYearNameRow = currentYearMetadataRow + 1;

  return {
    previousYear: {
      empIDCell: 'D2',
      departmentCell: hasReturnTaiwanLeave ? 'I2' : 'H2',
      periodCell: hasReturnTaiwanLeave ? 'O2' : 'L2',
      nameCell: 'D3',
      annualLeaveDaysCell: hasReturnTaiwanLeave ? undefined : 'H3',
      annualLeaveHoursCell: hasReturnTaiwanLeave ? 'O3' : 'L3',
      returnTaiwanHoursCell: hasReturnTaiwanLeave ? 'I3' : undefined,
      detailStartRow: PREVIOUS_YEAR_DETAIL_START, detailEndRow: PREVIOUS_YEAR_TEMPLATE_DETAIL_END + previousOverflow,
      totalRow: PREVIOUS_YEAR_TOTAL_ROW + previousOverflow, openingRow: 6
    },
    currentYear: {
      empIDCell: `D${currentYearMetadataRow}`,
      departmentCell: `${hasReturnTaiwanLeave ? 'I' : 'H'}${currentYearMetadataRow}`,
      periodCell: `${hasReturnTaiwanLeave ? 'O' : 'L'}${currentYearMetadataRow}`,
      nameCell: `D${currentYearNameRow}`,
      annualLeaveDaysCell: hasReturnTaiwanLeave ? undefined : `H${currentYearNameRow}`,
      annualLeaveHoursCell: `${hasReturnTaiwanLeave ? 'O' : 'L'}${currentYearNameRow}`,
      returnTaiwanHoursCell: hasReturnTaiwanLeave ? `I${currentYearNameRow}` : undefined,
      detailStartRow: CURRENT_YEAR_TEMPLATE_DETAIL_START + previousOverflow,
      detailEndRow: CURRENT_YEAR_TEMPLATE_DETAIL_END + previousOverflow + currentOverflow,
      totalRow: CURRENT_YEAR_TOTAL_ROW + previousOverflow + currentOverflow
    }
  };
};

const insertDetailRows = (worksheet: ExcelJS.Worksheet, insertAt: number, count: number, columns: ReportColumns): void => {
  if (count === 0) return;
  const sourceRow = worksheet.getRow(insertAt - 1);
  const sourceCells = Array.from({ length: columns.lastColumn.charCodeAt(0) - 64 }, (_, index) => worksheet.getCell(insertAt - 1, index + 1));
  worksheet.spliceRows(insertAt, 0, ...Array.from({ length: count }, () => []));
  for (let rowNumber = insertAt; rowNumber < insertAt + count; rowNumber += 1) {
    const targetRow = worksheet.getRow(rowNumber);
    targetRow.height = sourceRow.height;
    sourceCells.forEach((sourceCell, index) => {
      const targetCell = worksheet.getCell(rowNumber, index + 1);
      targetCell.style = { ...sourceCell.style };
      targetCell.numFmt = sourceCell.numFmt;
    });
  }
};

const restoreMergedCells = (worksheet: ExcelJS.Worksheet, mergeRanges: string[], previousOverflow: number, currentOverflow: number): void => {
  const moveRow = (row: number): number => {
    if (row >= CURRENT_YEAR_TOTAL_ROW) return row + previousOverflow + currentOverflow;
    if (row >= PREVIOUS_YEAR_TOTAL_ROW) return row + previousOverflow;
    return row;
  };
  mergeRanges.forEach(range => {
    const [start, end] = range.split(':');
    const startMatch = start.match(/^([A-Z]+)(\d+)$/);
    const endMatch = end.match(/^([A-Z]+)(\d+)$/);
    if (startMatch && endMatch) worksheet.mergeCells(`${startMatch[1]}${moveRow(Number(startMatch[2]))}:${endMatch[1]}${moveRow(Number(endMatch[2]))}`);
  });
};

const setMetadata = (
  worksheet: ExcelJS.Worksheet,
  metadata: {
    employee: IEmployee;
    annualLeaveDays: number[];
    annualLeaveUsed: number;
    returnTaiwanBalances?: Awaited<ReturnType<typeof ReturnTaiwanLeaveService.getBalance>>[];
    yearRange: ReturnType<typeof LeaveService.getYearRanges>;
    year: number;
  },
  layouts: { previousYear: YearBlockLayout; currentYear: YearBlockLayout },
  columns: ReportColumns
): void => {
  const { employee, annualLeaveDays, annualLeaveUsed, returnTaiwanBalances, yearRange, year } = metadata;
  const setBlockMetadata = (layout: YearBlockLayout, period: string, days: number, hours: number, returnTaiwanHours?: number): void => {
    worksheet.getCell(layout.empIDCell).value = employee.empID;
    worksheet.getCell(layout.departmentCell).value = employee.department || '';
    worksheet.getCell(layout.periodCell).value = period;
    worksheet.getCell(layout.nameCell).value = employee.name;
    if (layout.annualLeaveDaysCell) worksheet.getCell(layout.annualLeaveDaysCell).value = days;
    worksheet.getCell(layout.annualLeaveHoursCell).value = hours;
    if (layout.returnTaiwanHoursCell) worksheet.getCell(layout.returnTaiwanHoursCell).value = returnTaiwanHours ?? 0;
  };
  setBlockMetadata(layouts.previousYear, ` ${yearRange.lastYearStart.format('YYYY/MM/DD')} ~ ${yearRange.lastYearEnd.format('YYYY/MM/DD')}`, annualLeaveDays[0], annualLeaveDays[1], returnTaiwanBalances?.[0].totalHours);
  setBlockMetadata(layouts.currentYear, ` ${yearRange.thisYearStart.format('YYYY/MM/DD')} ~ ${yearRange.thisYearEnd.format('YYYY/MM/DD')}`, annualLeaveDays[2], annualLeaveDays[3], returnTaiwanBalances?.[1].totalHours);

  worksheet.getCell('A6').value = `${year}年度已請時數`;
  worksheet.getCell(columns.specialLeave + '6').value = annualLeaveUsed;
  worksheet.getCell(columns.accumulatedSpecialLeave + '6').value = { formula: `${columns.specialLeave}6`, result: annualLeaveUsed };
  worksheet.getCell(columns.remainingSpecialLeave + '6').value = { formula: `${layouts.previousYear.annualLeaveHoursCell}-${columns.accumulatedSpecialLeave}6` };
  if (columns.returnTaiwanLeave && columns.accumulatedReturnTaiwanLeave && columns.remainingReturnTaiwanLeave && layouts.previousYear.returnTaiwanHoursCell) {
    worksheet.getCell(columns.returnTaiwanLeave + '6').value = returnTaiwanBalances?.[0].usedHours ?? 0;
    worksheet.getCell(columns.accumulatedReturnTaiwanLeave + '6').value = { formula: `${columns.returnTaiwanLeave}6`, result: returnTaiwanBalances?.[0].usedHours ?? 0 };
    worksheet.getCell(columns.remainingReturnTaiwanLeave + '6').value = { formula: `${layouts.previousYear.returnTaiwanHoursCell}-${columns.accumulatedReturnTaiwanLeave}6` };
  }
};

const clearTemplateDetails = (worksheet: ExcelJS.Worksheet, layout: YearBlockLayout, columns: ReportColumns): void => {
  for (let row = layout.detailStartRow; row <= layout.detailEndRow; row += 1) {
    columns.inputColumns.forEach(column => { worksheet.getCell(`${column}${row}`).value = null; });
    const previousSpecial = row === layout.detailStartRow ? (layout.openingRow ? `${columns.accumulatedSpecialLeave}${layout.openingRow}` : '0') : `${columns.accumulatedSpecialLeave}${row - 1}`;
    worksheet.getCell(`${columns.accumulatedSpecialLeave}${row}`).value = { formula: `${previousSpecial}+${columns.specialLeave}${row}` };
    worksheet.getCell(`${columns.remainingSpecialLeave}${row}`).value = { formula: `${layout.annualLeaveHoursCell}-${columns.accumulatedSpecialLeave}${row}` };
    if (columns.returnTaiwanLeave && columns.accumulatedReturnTaiwanLeave && columns.remainingReturnTaiwanLeave && layout.returnTaiwanHoursCell) {
      const previousReturnTaiwan = row === layout.detailStartRow ? (layout.openingRow ? `${columns.accumulatedReturnTaiwanLeave}${layout.openingRow}` : '0') : `${columns.accumulatedReturnTaiwanLeave}${row - 1}`;
      worksheet.getCell(`${columns.accumulatedReturnTaiwanLeave}${row}`).value = { formula: `${previousReturnTaiwan}+${columns.returnTaiwanLeave}${row}` };
      worksheet.getCell(`${columns.remainingReturnTaiwanLeave}${row}`).value = { formula: `${layout.returnTaiwanHoursCell}-${columns.accumulatedReturnTaiwanLeave}${row}` };
    }
  }
};

const writeYearRows = (worksheet: ExcelJS.Worksheet, rows: LeaveReportRow[], layout: YearBlockLayout, columns: ReportColumns): void => {
  rows.forEach((row, index) => {
    const targetRow = layout.detailStartRow + index;
    const leaveColumn = columns.leaveTypes[row.leaveType];
    worksheet.getCell(`A${targetRow}`).value = row.leaveStart;
    worksheet.getCell(`B${targetRow}`).value = row.leaveEnd;
    if (leaveColumn) worksheet.getCell(`${leaveColumn}${targetRow}`).value = row.duration;
    else worksheet.getCell(`${columns.note}${targetRow}`).value = `${row.leaveType} ${row.duration} 小時${row.reason ? `；${row.reason}` : ''}`;
    if (leaveColumn && row.reason) worksheet.getCell(`${columns.note}${targetRow}`).value = row.reason;
  });
};

const setBlockFooter = (worksheet: ExcelJS.Worksheet, layout: YearBlockLayout, columns: ReportColumns): void => {
  worksheet.getCell(`A${layout.totalRow}`).value = '總計';
  columns.totalColumns.forEach(column => {
    const total = `SUM(${column}${layout.detailStartRow}:${column}${layout.detailEndRow})`;
    worksheet.getCell(`${column}${layout.totalRow}`).value = { formula: column === columns.specialLeave && layout.openingRow ? `${total}+${columns.specialLeave}${layout.openingRow}` : total };
  });
  worksheet.getCell(`${columns.accumulatedSpecialLeave}${layout.totalRow}`).value = { formula: `${columns.accumulatedSpecialLeave}${layout.detailEndRow}` };
  worksheet.getCell(`${columns.remainingSpecialLeave}${layout.totalRow}`).value = { formula: `${columns.remainingSpecialLeave}${layout.detailEndRow}` };
  if (columns.accumulatedReturnTaiwanLeave && columns.remainingReturnTaiwanLeave) {
    worksheet.getCell(`${columns.accumulatedReturnTaiwanLeave}${layout.totalRow}`).value = { formula: `${columns.accumulatedReturnTaiwanLeave}${layout.detailEndRow}` };
    worksheet.getCell(`${columns.remainingReturnTaiwanLeave}${layout.totalRow}`).value = { formula: `${columns.remainingReturnTaiwanLeave}${layout.detailEndRow}` };
  }
  worksheet.unMergeCells(`A${layout.totalRow}:B${layout.totalRow}`);
  worksheet.mergeCells(`A${layout.totalRow}:B${layout.totalRow}`);
};
