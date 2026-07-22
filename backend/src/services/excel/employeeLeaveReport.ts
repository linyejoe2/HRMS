import ExcelJS from 'exceljs';
import { readFile } from 'fs/promises';
import path from 'path';
import legacyLeave from '../../config/legacyLeave.json';
import { Employee, IEmployee, Leave } from '../../models';
import { APIError } from '../../middleware';
import { LeaveService } from '../leaveService';
import { dayjsTz, dayjsToTz } from '../../util/utility';

const TEMPLATE_PATH = path.resolve(__dirname, '../../../assets/report-templates/employee-leave-report.xlsx');
const WORKSHEET_NAME = '請假表';
const PREVIOUS_YEAR_DETAIL_START = 7;
const PREVIOUS_YEAR_TEMPLATE_DETAIL_END = 19;
const CURRENT_YEAR_TEMPLATE_DETAIL_START = 28;
const CURRENT_YEAR_TEMPLATE_DETAIL_END = 41;
const PREVIOUS_YEAR_CAPACITY = PREVIOUS_YEAR_TEMPLATE_DETAIL_END - PREVIOUS_YEAR_DETAIL_START + 1;
const CURRENT_YEAR_CAPACITY = CURRENT_YEAR_TEMPLATE_DETAIL_END - CURRENT_YEAR_TEMPLATE_DETAIL_START + 1;

const INPUT_COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'R'];
const LEAVE_TOTAL_COLUMNS = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

type LeaveReportRow = {
  leaveStart: Date;
  leaveEnd: Date;
  leaveType: string;
  duration: number;
  reason: string;
};

type YearColumns = {
  start: string;
  end: string;
  leaveTypes: Record<string, string>;
  specialLeave: string;
  accumulatedSpecialLeave: string;
  remainingSpecialLeave: string;
  note: string;
};

type YearBlockLayout = {
  empIDCell: string;
  departmentCell: string;
  periodCell: string;
  nameCell: string;
  annualLeaveDaysCell: string;
  annualLeaveHoursCell: string;
  detailStartRow: number;
  detailEndRow: number;
  totalRow: number;
  openingRow?: number;
};

const YEAR_COLUMNS: YearColumns = {
  start: 'A',
  end: 'B',
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

const leaveDuration = (hour: string, minutes: string): number => Number(hour) + Number(minutes) / 60;

export const generateEmployeeLeaveReport = async (empID: string, startDate: string, endDate: string): Promise<ExcelJS.Buffer> => {
  const employee = await Employee.findOne({ empID });
  if (!employee) {
    throw new APIError('Employee not found', 404);
  }

  const start = dayjsTz(startDate).startOf('day');
  const end = dayjsTz(endDate).endOf('day');

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
    yearRange,
    year: start.year()
  });
};

const formatOutput = async (
  reportData: LeaveReportRow[],
  metadata: {
    employee: IEmployee;
    annualLeaveDays: number[];
    annualLeaveUsed: number;
    yearRange: ReturnType<typeof LeaveService.getYearRanges>;
    year: number;
  }
): Promise<ExcelJS.Buffer> => {
  const workbook = new ExcelJS.Workbook();

  try {
    const template = await readFile(TEMPLATE_PATH);
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

  const layouts = expandDetailRows(worksheet, previousYearRows.length, currentYearRows.length);
  setMetadata(worksheet, metadata, layouts);
  clearTemplateDetails(worksheet, layouts.previousYear);
  clearTemplateDetails(worksheet, layouts.currentYear);
  writeYearRows(worksheet, previousYearRows, layouts.previousYear);
  writeYearRows(worksheet, currentYearRows, layouts.currentYear);
  setBlockFooter(worksheet, layouts.previousYear);
  setBlockFooter(worksheet, layouts.currentYear);
  worksheet.pageSetup.printArea = `A1:R${layouts.currentYear.totalRow}`;

  return workbook.xlsx.writeBuffer();
};

const trimTemplateRows = (worksheet: ExcelJS.Worksheet): void => {
  const rows = (worksheet as ExcelJS.Worksheet & { _rows: Array<ExcelJS.Row | undefined> })._rows;

  rows.length = 43;
};

const expandDetailRows = (
  worksheet: ExcelJS.Worksheet,
  previousYearCount: number,
  currentYearCount: number
): { previousYear: YearBlockLayout; currentYear: YearBlockLayout } => {
  const previousOverflow = Math.max(0, previousYearCount - PREVIOUS_YEAR_CAPACITY);
  const currentOverflow = Math.max(0, currentYearCount - CURRENT_YEAR_CAPACITY);

  const mergeRanges = [...worksheet.model.merges];
  mergeRanges.forEach(range => worksheet.unMergeCells(range));

  worksheet.spliceRows(42, 1);
  worksheet.spliceRows(20, 1);
  insertDetailRows(worksheet, 20, previousOverflow);
  insertDetailRows(worksheet, 41 + previousOverflow, currentOverflow);
  restoreMergedCells(worksheet, mergeRanges, previousOverflow, currentOverflow);

  return {
    previousYear: {
      empIDCell: 'D2',
      departmentCell: 'H2',
      periodCell: 'L2',
      nameCell: 'D3',
      annualLeaveDaysCell: 'H3',
      annualLeaveHoursCell: 'L3',
      detailStartRow: PREVIOUS_YEAR_DETAIL_START,
      detailEndRow: PREVIOUS_YEAR_TEMPLATE_DETAIL_END + previousOverflow,
      totalRow: 20 + previousOverflow,
      openingRow: 6
    },
    currentYear: {
      empIDCell: `D${23 + previousOverflow}`,
      departmentCell: `H${23 + previousOverflow}`,
      periodCell: `L${23 + previousOverflow}`,
      nameCell: `D${24 + previousOverflow}`,
      annualLeaveDaysCell: `H${24 + previousOverflow}`,
      annualLeaveHoursCell: `L${24 + previousOverflow}`,
      detailStartRow: 27 + previousOverflow,
      detailEndRow: 40 + previousOverflow + currentOverflow,
      totalRow: 41 + previousOverflow + currentOverflow
    }
  };
};

const insertDetailRows = (worksheet: ExcelJS.Worksheet, insertAt: number, count: number): void => {
  if (count === 0) {
    return;
  }

  const sourceRow = worksheet.getRow(insertAt - 1);
  const sourceCells = Array.from({ length: 18 }, (_, index) => worksheet.getCell(insertAt - 1, index + 1));
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

const restoreMergedCells = (
  worksheet: ExcelJS.Worksheet,
  mergeRanges: string[],
  previousOverflow: number,
  currentOverflow: number
): void => {
  const moveRow = (row: number): number => {
    if (row > CURRENT_YEAR_TEMPLATE_DETAIL_END + 1) {
      return row + previousOverflow + currentOverflow - 2;
    }
    if (row > PREVIOUS_YEAR_TEMPLATE_DETAIL_END) {
      return row + previousOverflow - 1;
    }
    return row;
  };

  mergeRanges.forEach(range => {
    const [start, end] = range.split(':');
    const startMatch = start.match(/^([A-Z]+)(\d+)$/);
    const endMatch = end.match(/^([A-Z]+)(\d+)$/);
    if (!startMatch || !endMatch) {
      return;
    }
    worksheet.mergeCells(`${startMatch[1]}${moveRow(Number(startMatch[2]))}:${endMatch[1]}${moveRow(Number(endMatch[2]))}`);
  });
};

const setMetadata = (
  worksheet: ExcelJS.Worksheet,
  metadata: {
    employee: IEmployee;
    annualLeaveDays: number[];
    annualLeaveUsed: number;
    yearRange: ReturnType<typeof LeaveService.getYearRanges>;
    year: number;
  },
  layouts: { previousYear: YearBlockLayout; currentYear: YearBlockLayout }
): void => {
  const { employee, annualLeaveDays, annualLeaveUsed, yearRange, year } = metadata;
  const setBlockMetadata = (layout: YearBlockLayout, period: string, days: number, hours: number): void => {
    worksheet.getCell(layout.empIDCell).value = employee.empID;
    worksheet.getCell(layout.departmentCell).value = employee.department || '';
    worksheet.getCell(layout.periodCell).value = period;
    worksheet.getCell(layout.nameCell).value = employee.name;
    worksheet.getCell(layout.annualLeaveDaysCell).value = days;
    worksheet.getCell(layout.annualLeaveHoursCell).value = hours;
  };

  setBlockMetadata(
    layouts.previousYear,
    ` ${yearRange.lastYearStart.format('YYYY/MM/DD')} ~ ${yearRange.lastYearEnd.format('YYYY/MM/DD')}`,
    annualLeaveDays[0],
    annualLeaveDays[1]
  );
  setBlockMetadata(
    layouts.currentYear,
    ` ${yearRange.thisYearStart.format('YYYY/MM/DD')} ~ ${yearRange.thisYearEnd.format('YYYY/MM/DD')}`,
    annualLeaveDays[2],
    annualLeaveDays[3]
  );

  worksheet.getCell('A6').value = `${year}年度已請時數`;
  worksheet.getCell('O6').value = annualLeaveUsed;
  worksheet.getCell('P6').value = { formula: 'O6', result: annualLeaveUsed };
  worksheet.getCell('Q6').value = { formula: 'L3-P6' };
};

const clearTemplateDetails = (worksheet: ExcelJS.Worksheet, layout: YearBlockLayout): void => {
  for (let row = layout.detailStartRow; row <= layout.detailEndRow; row += 1) {
    for (const column of INPUT_COLUMNS) {
      worksheet.getCell(`${column}${row}`).value = null;
    }

    const previousAccumulated = row === layout.detailStartRow
      ? layout.openingRow ? `P${layout.openingRow}` : '0'
      : `P${row - 1}`;
    worksheet.getCell(`P${row}`).value = { formula: `${previousAccumulated}+O${row}` };
    worksheet.getCell(`Q${row}`).value = { formula: `${layout.annualLeaveHoursCell}-P${row}` };
  }
};

const writeYearRows = (worksheet: ExcelJS.Worksheet, rows: LeaveReportRow[], layout: YearBlockLayout): void => {
  rows.forEach((row, index) => {
    const targetRow = layout.detailStartRow + index;
    const leaveColumn = YEAR_COLUMNS.leaveTypes[row.leaveType];

    worksheet.getCell(`${YEAR_COLUMNS.start}${targetRow}`).value = row.leaveStart;
    worksheet.getCell(`${YEAR_COLUMNS.end}${targetRow}`).value = row.leaveEnd;

    if (leaveColumn) {
      worksheet.getCell(`${leaveColumn}${targetRow}`).value = row.duration;
    } else {
      worksheet.getCell(`${YEAR_COLUMNS.note}${targetRow}`).value = `${row.leaveType} ${row.duration} 小時${row.reason ? `；${row.reason}` : ''}`;
    }

    if (leaveColumn && row.reason) {
      worksheet.getCell(`${YEAR_COLUMNS.note}${targetRow}`).value = row.reason;
    }
  });
};

const setBlockFooter = (worksheet: ExcelJS.Worksheet, layout: YearBlockLayout): void => {
  worksheet.getCell(`A${layout.totalRow}`).value = '總計';
  for (const column of LEAVE_TOTAL_COLUMNS) {
    const detailTotal = `SUM(${column}${layout.detailStartRow}:${column}${layout.detailEndRow})`;
    worksheet.getCell(`${column}${layout.totalRow}`).value = {
      formula: column === YEAR_COLUMNS.specialLeave && layout.openingRow
        ? `${detailTotal}+O${layout.openingRow}`
        : detailTotal
    };
  }
  worksheet.getCell(`P${layout.totalRow}`).value = { formula: `P${layout.detailEndRow}` };
  worksheet.getCell(`Q${layout.totalRow}`).value = { formula: `Q${layout.detailEndRow}` };
  worksheet.unMergeCells(`A${layout.totalRow}:B${layout.totalRow}`);
  worksheet.mergeCells(`A${layout.totalRow}:B${layout.totalRow}`);
};
