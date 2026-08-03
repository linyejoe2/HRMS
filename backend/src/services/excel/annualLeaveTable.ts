import ExcelJS from 'exceljs';
import { Employee, Leave } from '../../models';
import { LeaveService } from '../leaveService';
import { dayjsNum, dayjsTz, dayjsToTz } from '../../util/utility';

export const generateAnnualLeaveTable = async (year: number, month?: number): Promise<ExcelJS.Buffer> => {
  const title = month ? `${year}年${month}月特休表` : `${year}年特休表`

  // 特休表統計的是今年以及去年的特休
  month = 12
  // 去年 12 月 24 號 00:00 開始算今年
  // 實際計算特休應該從今年 12 月 24 號算才准
  const referenceDate = dayjsNum(year, month, 24)

  const employees = await Employee.find({
    isActive: true,
    // 確保 hireDate 存在、不為 null，且小於基準日
    hireDate: { $exists: true, $ne: null, $lt: referenceDate.toDate() },

    // 離職日條件：沒有離職日，或者離職日大於基準日
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gt: referenceDate.toDate() } }
    ]
  }).sort({ empID: 1 });

  const reportData: any[] = [];

  for (const emp of employees) {
    const annualLeaveDays =await LeaveService.calcAnnualLeaveDaysByEmployee(emp, referenceDate);
    const yearRange = LeaveService.getYearRanges(dayjsToTz(emp.hireDate), referenceDate);

    reportData.push({
      '員工編號': emp.empID,
      '姓名': emp.name,
      "到職日前應休天數": annualLeaveDays[0],
      "應休時數": annualLeaveDays[1],
      "起": yearRange.lastYearStart.format('YYYY/MM/DD'),
      "迄": yearRange.lastYearEnd.format('YYYY/MM/DD'),
      "到職日後應休天數": annualLeaveDays[2],
      "應休時數2": annualLeaveDays[3],
      "起2": yearRange.thisYearStart.format('YYYY/MM/DD'),
      "迄2": yearRange.thisYearEnd.format('YYYY/MM/DD'),
      "到職日": dayjsTz(emp.hireDate).format('YYYY/MM/DD')
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