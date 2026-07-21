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
const FIRST_DETAIL_ROW = 7;
const LAST_DETAIL_ROW = 19;

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
  specialLeaveHours: string;
};

const PREVIOUS_YEAR_COLUMNS: YearColumns = {
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
  note: 'R',
  specialLeaveHours: 'L'
};

const CURRENT_YEAR_COLUMNS: YearColumns = {
  start: 'T',
  end: 'U',
  leaveTypes: {
    '普通傷病假': 'V',
    '事假': 'W',
    '婚假': 'X',
    '喪假': 'Y',
    '生理假': 'Z',
    '公假': 'AA',
    '公傷病假': 'AB',
    '產假': 'AC',
    '產檢假': 'AD',
    '陪產檢及陪產假': 'AE',
    '安胎休養請假': 'AF',
    '育嬰留職停薪': 'AG',
    '特別休假': 'AH'
  },
  specialLeave: 'AH',
  accumulatedSpecialLeave: 'AI',
  remainingSpecialLeave: 'AJ',
  note: 'AK',
  specialLeaveHours: 'AE'
};

const DETAIL_COLUMNS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'R',
  'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AK'
];

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

  setMetadata(worksheet, metadata);
  clearTemplateDetails(worksheet);

  const previousYearRows: LeaveReportRow[] = [];
  const currentYearRows: LeaveReportRow[] = [];

  for (const row of reportData) {
    if (dayjsToTz(row.leaveStart).isBefore(metadata.yearRange.lastYearEnd)) {
      previousYearRows.push(row);
    } else {
      currentYearRows.push(row);
    }
  }

  writeYearRows(worksheet, previousYearRows, PREVIOUS_YEAR_COLUMNS);
  writeYearRows(worksheet, currentYearRows, CURRENT_YEAR_COLUMNS);

  return workbook.xlsx.writeBuffer();
};

const setMetadata = (
  worksheet: ExcelJS.Worksheet,
  metadata: {
    employee: IEmployee;
    annualLeaveDays: number[];
    annualLeaveUsed: number;
    yearRange: ReturnType<typeof LeaveService.getYearRanges>;
    year: number;
  }
): void => {
  const { employee, annualLeaveDays, annualLeaveUsed, yearRange, year } = metadata;

  worksheet.getCell('D2').value = employee.empID;
  worksheet.getCell('H2').value = employee.department || '';
  worksheet.getCell('L2').value = ` ${yearRange.lastYearStart.format('YYYY/MM/DD')} ~ ${yearRange.lastYearEnd.format('YYYY/MM/DD')}`;
  worksheet.getCell('D3').value = employee.name;
  worksheet.getCell('H3').value = annualLeaveDays[0];
  worksheet.getCell('L3').value = annualLeaveDays[1];

  worksheet.getCell('W2').value = employee.empID;
  worksheet.getCell('AA2').value = employee.department || '';
  worksheet.getCell('AE2').value = ` ${yearRange.thisYearStart.format('YYYY/MM/DD')} ~ ${yearRange.thisYearEnd.format('YYYY/MM/DD')}`;
  worksheet.getCell('W3').value = employee.name;
  worksheet.getCell('AA3').value = annualLeaveDays[2];
  worksheet.getCell('AE3').value = annualLeaveDays[3];

  worksheet.getCell('A6').value = `${year}年度已請時數`;
  worksheet.getCell('O6').value = annualLeaveUsed;
  worksheet.getCell('P6').value = { formula: 'O6', result: annualLeaveUsed };
  worksheet.getCell('Q6').value = { formula: 'L3-P6' };
  worksheet.getCell('AH6').value = 0;
  worksheet.getCell('AI6').value = { formula: 'AH6', result: 0 };
  worksheet.getCell('AI6').numFmt = 'General';
  worksheet.getCell('AJ6').value = { formula: 'AE3-AI6' };
};

const clearTemplateDetails = (worksheet: ExcelJS.Worksheet): void => {
  for (let row = FIRST_DETAIL_ROW; row <= LAST_DETAIL_ROW; row += 1) {
    for (const column of DETAIL_COLUMNS) {
      worksheet.getCell(`${column}${row}`).value = null;
    }
    worksheet.getCell(`P${row}`).value = { formula: `P${row - 1}+O${row}` };
    worksheet.getCell(`Q${row}`).value = { formula: `L3-P${row}` };
    worksheet.getCell(`AI${row}`).value = { formula: `AI${row - 1}+AH${row}` };
    worksheet.getCell(`AJ${row}`).value = { formula: `AE3-AI${row}` };
  }
};

const writeYearRows = (worksheet: ExcelJS.Worksheet, rows: LeaveReportRow[], columns: YearColumns): void => {
  if (rows.length > LAST_DETAIL_ROW - FIRST_DETAIL_ROW + 1) {
    throw new APIError('請假明細超出範本可容納的列數', 400);
  }

  rows.forEach((row, index) => {
    const targetRow = FIRST_DETAIL_ROW + index;
    const leaveColumn = columns.leaveTypes[row.leaveType];

    worksheet.getCell(`${columns.start}${targetRow}`).value = row.leaveStart;
    worksheet.getCell(`${columns.end}${targetRow}`).value = row.leaveEnd;

    if (leaveColumn) {
      worksheet.getCell(`${leaveColumn}${targetRow}`).value = row.duration;
    } else {
      worksheet.getCell(`${columns.note}${targetRow}`).value = `${row.leaveType} ${row.duration} 小時${row.reason ? `；${row.reason}` : ''}`;
    }

    if (leaveColumn && row.reason) {
      worksheet.getCell(`${columns.note}${targetRow}`).value = row.reason;
    }
  });
};
