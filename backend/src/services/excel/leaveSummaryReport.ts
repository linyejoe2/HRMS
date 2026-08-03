import ExcelJS from 'exceljs';
import { readFile } from 'fs/promises';
import path from 'path';
import legacyLeavejson from '../../config/legacyLeave.json';
import { Employee, ILeave, Leave, LeaveAdjustment } from '../../models';
import { APIError } from '../../middleware';
import { LeaveService } from '../leaveService';
import { ReturnTaiwanLeaveService } from '../returnTaiwanLeaveService';
import { dayjsNum, dayjsTz } from '../../util/utility';

const TEMPLATE_PATH = path.resolve(__dirname, '../../../assets/report-templates/leave-summary-report.xlsx');
const WORKSHEET_NAME = '請假總表';
const FIRST_DATA_ROW = 4;
const LAST_TEMPLATE_DATA_ROW = 18;
const GENERIC_DATA_ROW = LAST_TEMPLATE_DATA_ROW - 1;
const TEMPLATE_DATA_CAPACITY = LAST_TEMPLATE_DATA_ROW - FIRST_DATA_ROW + 1;
const TEMPLATE_LAST_ROW = LAST_TEMPLATE_DATA_ROW;

const DATA_COLUMNS = [
  'empId',
  'name',
  'lastYearDays',
  'remain',
  't1',
  't2',
  'days',
  'remain2',
  't3',
  't4',
  'totalSpecialHours',
  'remainingHours',
  'annualLeave',
  'returnTaiwanTotalHours',
  'returnTaiwanRemainingHours',
  'returnTaiwanUsedHours',
  'sickLeave',
  'personalLeave',
  'marriageLeave',
  'funeralLeave',
  'officialLeave',
  'injuryLeave'
] as const;

type LeaveSummaryRow = Record<(typeof DATA_COLUMNS)[number], string | number>;

const clearTemplateData = (worksheet: ExcelJS.Worksheet): void => {
  for (let row = FIRST_DATA_ROW; row <= LAST_TEMPLATE_DATA_ROW; row += 1) {
    for (let column = 1; column <= DATA_COLUMNS.length; column += 1) {
      worksheet.getCell(row, column).value = null;
    }
  }
};

const insertDataRows = (worksheet: ExcelJS.Worksheet, count: number): void => {
  if (count === 0) {
    return;
  }

  const sourceRow = worksheet.getRow(GENERIC_DATA_ROW);
  const sourceCells = Array.from({ length: DATA_COLUMNS.length }, (_, index) => worksheet.getCell(GENERIC_DATA_ROW, index + 1));
  worksheet.spliceRows(LAST_TEMPLATE_DATA_ROW, 0, ...Array.from({ length: count }, () => []));

  for (let row = LAST_TEMPLATE_DATA_ROW; row < LAST_TEMPLATE_DATA_ROW + count; row += 1) {
    const targetRow = worksheet.getRow(row);
    targetRow.height = sourceRow.height;
    sourceCells.forEach((sourceCell, index) => {
      const targetCell = worksheet.getCell(row, index + 1);
      targetCell.style = { ...sourceCell.style };
      targetCell.numFmt = sourceCell.numFmt;
    });
  }
};

export const generateLeaveSummaryReport = async (year: number, month: number): Promise<ExcelJS.Buffer> => {
  const monthStart = dayjsNum(year, month - 1, 24);
  const monthEnd = dayjsNum(year, month, 23, 23, 59, 59, 999);
  const annualLeaveReferenceDate = dayjsNum(year, 12, 23);

  const employees = await Employee.find({
    isActive: true,
    hireDate: { $exists: true, $ne: null, $lt: monthEnd.toDate() },
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gt: monthEnd.toDate() } }
    ]
  }).sort({ empID: 1 });

  const yearStart = dayjsNum(year - 1, 12, 24);

  const [monthLeaves, yearToMonthLeaves, allAdjustments] = await Promise.all([
    Leave.find({ status: 'approved', leaveStart: { $gte: monthStart.toDate(), $lte: monthEnd.toDate() } }),
    Leave.find({ status: 'approved', leaveStart: { $gte: yearStart.toDate(), $lte: monthEnd.toDate() } }),
    LeaveAdjustment.find({})
  ]);

  const sumMinutes = (leaves: ILeave[]): number =>
    leaves.reduce((sum, leave) => sum + parseInt(leave.hour) * 60 + parseInt(leave.minutes), 0);

  const reportData: LeaveSummaryRow[] = [];

  for (const employee of employees) {
    const empMonthLeaves = monthLeaves.filter(leave => leave.empID === employee.empID);
    const empYearLeaves = yearToMonthLeaves.filter(leave => leave.empID === employee.empID);
    const empAdj = allAdjustments.filter(adjustment => adjustment.empID === employee.empID);
    const empLegacyCalc = LeaveService.getYearRanges(dayjsTz(employee.hireDate), monthEnd);
    const remain = legacyLeavejson.find(leave => leave.id === employee.empID)?.remain || 0;

    const annualLeaveDays = await LeaveService.calcAnnualLeaveDaysByEmployee(employee, annualLeaveReferenceDate);
    const remainAnnualLeaveDays = await LeaveService.calcRemainAnnualLeaveDays(employee, monthEnd);
    const returnTaiwanBalance = await ReturnTaiwanLeaveService.getBalance(employee, monthEnd);

    const monthH = (dbType: string) =>
      Math.round(sumMinutes(empMonthLeaves.filter(leave => leave.leaveType === dbType))) / 60;

    reportData.push({
      empId: employee.empID,
      name: employee.name,
      lastYearDays: annualLeaveDays[0],
      remain: remainAnnualLeaveDays[0],
      t1: empLegacyCalc.lastYearStart.format('YYYY/MM/DD'),
      t2: empLegacyCalc.lastYearEnd.format('YYYY/MM/DD'),
      days: annualLeaveDays[2],
      remain2: remainAnnualLeaveDays[1],
      t3: empLegacyCalc.thisYearStart.format('YYYY/MM/DD'),
      t4: empLegacyCalc.thisYearEnd.format('YYYY/MM/DD'),
      totalSpecialHours: remainAnnualLeaveDays[2],
      remainingHours: remainAnnualLeaveDays[3],
      annualLeave: monthH('特別休假'),
      returnTaiwanTotalHours: returnTaiwanBalance.eligible ? returnTaiwanBalance.totalHours : 0,
      returnTaiwanRemainingHours: returnTaiwanBalance.eligible ? returnTaiwanBalance.remainingHours : 0,
      returnTaiwanUsedHours: returnTaiwanBalance.eligible ? returnTaiwanBalance.usedHours : 0,
      sickLeave: monthH('普通傷病假'),
      personalLeave: monthH('事假'),
      marriageLeave: monthH('婚假'),
      funeralLeave: monthH('喪假'),
      officialLeave: monthH('公假'),
      injuryLeave: monthH('公傷病假')
    });
  }

  return formatOutput(reportData, year, month);
};

const formatOutput = async (reportData: LeaveSummaryRow[], year: number, month: number): Promise<ExcelJS.Buffer> => {
  const workbook = new ExcelJS.Workbook();
  let worksheet: ExcelJS.Worksheet;

  try {
    const template = await readFile(TEMPLATE_PATH);
    await workbook.xlsx.load(template.buffer.slice(template.byteOffset, template.byteOffset + template.byteLength) as ArrayBuffer);
  } catch {
    throw new APIError('請假總表範本不存在或無法讀取', 500);
  }

  worksheet = workbook.getWorksheet(WORKSHEET_NAME)!;
  if (!worksheet) {
    throw new APIError(`請假總表範本缺少工作表：${WORKSHEET_NAME}`, 500);
  }

  const rows = (worksheet as ExcelJS.Worksheet & { _rows: Array<ExcelJS.Row | undefined> })._rows;
  rows.length = TEMPLATE_LAST_ROW;

  const monthLabel = String(month).padStart(2, '0');
  worksheet.name = `${year}年${monthLabel}月請假總表`;
  worksheet.getCell('C2').value = `${year}年到職日前可請休天數`;
  worksheet.getCell('G2').value = `${year}年到職日後可請休天數`;
  worksheet.getCell('K2').value = `${monthLabel}假況(時)`;

  clearTemplateData(worksheet);
  insertDataRows(worksheet, Math.max(0, reportData.length - TEMPLATE_DATA_CAPACITY));

  reportData.forEach((row, rowIndex) => {
    const targetRow = worksheet.getRow(FIRST_DATA_ROW + rowIndex);
    DATA_COLUMNS.forEach((column, columnIndex) => {
      targetRow.getCell(columnIndex + 1).value = row[column];
    });
  });
  worksheet.pageSetup.printArea = `A1:V${Math.max(LAST_TEMPLATE_DATA_ROW, FIRST_DATA_ROW + reportData.length - 1)}`;

  return workbook.xlsx.writeBuffer();
};
