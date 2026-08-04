import ExcelJS from 'exceljs';
import { readFile } from 'fs/promises';
import path from 'path';
import { Employee } from '../../models';
import { APIError } from '../../middleware';
import { LeaveService } from '../leaveService';
import { dayjsNum, dayjsTz, dayjsToTz } from '../../util/utility';

const TEMPLATE_PATH = path.resolve(__dirname, '../../../assets/report-templates/annual-leave-table.xlsx');
const FIRST_DATA_ROW = 4;
const LAST_TEMPLATE_DATA_ROW = 25;
const GENERIC_DATA_ROW = LAST_TEMPLATE_DATA_ROW;
const TEMPLATE_DATA_CAPACITY = LAST_TEMPLATE_DATA_ROW - FIRST_DATA_ROW + 1;
const DATA_COLUMN_COUNT = 11;

type AnnualLeaveRow = [string, string, number, number, string, string, number, number, string, string, string];

const clearTemplateData = (worksheet: ExcelJS.Worksheet): void => {
  for (let row = FIRST_DATA_ROW; row <= LAST_TEMPLATE_DATA_ROW; row += 1) {
    for (let column = 1; column <= DATA_COLUMN_COUNT; column += 1) {
      worksheet.getCell(row, column).value = null;
    }
  }
};

const insertDataRows = (worksheet: ExcelJS.Worksheet, count: number): void => {
  if (count === 0) {
    return;
  }

  const sourceRow = worksheet.getRow(GENERIC_DATA_ROW);
  const sourceCells = Array.from(
    { length: DATA_COLUMN_COUNT },
    (_, index) => worksheet.getCell(GENERIC_DATA_ROW, index + 1)
  );
  const firstInsertedRow = LAST_TEMPLATE_DATA_ROW + 1;

  worksheet.spliceRows(firstInsertedRow, 0, ...Array.from({ length: count }, () => []));

  for (let row = firstInsertedRow; row < firstInsertedRow + count; row += 1) {
    const targetRow = worksheet.getRow(row);
    targetRow.height = sourceRow.height;

    sourceCells.forEach((sourceCell, index) => {
      const targetCell = worksheet.getCell(row, index + 1);
      targetCell.style = { ...sourceCell.style };
      targetCell.numFmt = sourceCell.numFmt;
    });
  }
};

export const generateAnnualLeaveTable = async (year: number, month?: number): Promise<ExcelJS.Buffer> => {
  const title = month ? `${year}年${month}月特休表` : `${year}年特休表`;
  const referenceDate = dayjsNum(year, 12, 24);

  const employees = await Employee.find({
    isActive: true,
    hireDate: { $exists: true, $ne: null, $lt: referenceDate.toDate() },
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gt: referenceDate.toDate() } }
    ]
  }).sort({ empID: 1 });

  const reportData: AnnualLeaveRow[] = [];

  for (const emp of employees) {
    const annualLeaveDays = await LeaveService.calcAnnualLeaveDaysByEmployee(emp, referenceDate);
    const yearRange = LeaveService.getYearRanges(dayjsToTz(emp.hireDate), referenceDate);

    reportData.push([
      emp.empID,
      emp.name,
      annualLeaveDays[0],
      annualLeaveDays[1],
      yearRange.lastYearStart.format('YYYY/MM/DD'),
      yearRange.lastYearEnd.format('YYYY/MM/DD'),
      annualLeaveDays[2],
      annualLeaveDays[3],
      yearRange.thisYearStart.format('YYYY/MM/DD'),
      yearRange.thisYearEnd.format('YYYY/MM/DD'),
      dayjsTz(emp.hireDate).format('YYYY/MM/DD')
    ]);
  }

  return formatOutput(reportData, title);
};

const formatOutput = async (reportData: AnnualLeaveRow[], title: string): Promise<ExcelJS.Buffer> => {
  const workbook = new ExcelJS.Workbook();
  let worksheet: ExcelJS.Worksheet | undefined;

  try {
    const template = await readFile(TEMPLATE_PATH);
    await workbook.xlsx.load(template.buffer.slice(template.byteOffset, template.byteOffset + template.byteLength) as ArrayBuffer);
    worksheet = workbook.worksheets[0];
  } catch (error) {
    throw new APIError('特休表範本不存在或無法讀取', 500);
  }

  if (!worksheet) {
    throw new APIError('特休表範本缺少工作表', 500);
  }

  worksheet.name = title;
  worksheet.getCell('A1').value = `臺龍電子股份有限公司 ${title}`;
  clearTemplateData(worksheet);
  insertDataRows(worksheet, Math.max(0, reportData.length - TEMPLATE_DATA_CAPACITY));

  reportData.forEach((rowData, index) => {
    const row = worksheet!.getRow(FIRST_DATA_ROW + index);
    rowData.forEach((value, columnIndex) => {
      row.getCell(columnIndex + 1).value = value;
    });
  });

  worksheet.pageSetup.printArea = `A1:K${Math.max(LAST_TEMPLATE_DATA_ROW, FIRST_DATA_ROW - 1 + reportData.length)}`;

  return workbook.xlsx.writeBuffer();
};
