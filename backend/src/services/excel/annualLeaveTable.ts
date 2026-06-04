import ExcelJS from 'exceljs';
import { Employee, Leave } from '../../models';
import { LeaveService } from '../leaveService';

export const generateAnnualLeaveTable = async (year: number, month?: number): Promise<ExcelJS.Buffer> => {
  const title = month ? `${year}年${month}月特休表` : `${year}年特休表`
  if (!month) month = 12
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const employees = await Employee.find({
    isActive: true,
    // 確保 hireDate 存在、不為 null，且小於基準日
    hireDate: { $exists: true, $ne: null, $lt: monthStart },

    // 離職日條件：沒有離職日，或者離職日大於基準日
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gt: monthStart } }
    ]
  }).sort({ empID: 1 });

  const reportData: any[] = [];

  for (const emp of employees) {
    const annualLeaveDays = LeaveService.calcAnnualLeaveDaysByEmployee(emp, monthStart);
    const yearRange = LeaveService.getYearRanges(emp.hireDate, monthEnd);

    reportData.push({
      '員工編號': emp.empID,
      '姓名': emp.name,
      "到職日前應休天數": annualLeaveDays[0],
      "應休時數": annualLeaveDays[1],
      "起": yearRange.lastYearStart,
      "迄": yearRange.lastYearEnd,
      "到職日後應休天數": annualLeaveDays[2],
      "應休時數2": annualLeaveDays[3],
      "起2": yearRange.thisYearStart,
      "迄2": yearRange.thisYearEnd,
      "到職日": emp.hireDate
    });
  }

  return _formatOutput(reportData, title);
}

const _formatOutput = async (reportData: any[], title: string): Promise<ExcelJS.Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title);

  worksheet.columns = [
    { header: '員工編號', key: '員工編號', width: 12 },
    { header: '姓名', key: '姓名', width: 12 },
    { header: `到職日前應休天數`, key: '到職日前應休天數', width: 20 },
    { header: `應修時數`, key: '應休時數', width: 16 },
    { header: `起`, key: '起', width: 12 },
    { header: `迄`, key: '迄', width: 12 },
    { header: `到職日後應休天數`, key: '到職日後應休天數', width: 20 },
    { header: `應修時數`, key: '應休時數2', width: 16 },
    { header: `起`, key: '起2', width: 12 },
    { header: `迄`, key: '迄2', width: 12 },
    { header: '到職日', key: '到職日', width: 12 },
  ];

  worksheet.addRows(reportData);

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}