import ExcelJS from 'exceljs';
import legacyLeavejson from "../../config/legacyLeave.json"
import { Employee, ILeave, Leave, LeaveAdjustment, LegacyLeave } from '../../models';
import { LeaveService } from '../leaveService';
import dayjs from 'dayjs';
import { dayjsNum, dayjsTz } from '../../util/utility';

/**
  * Generate 請假總表 (Leave Summary Report) Excel for a given year and month.
  * Columns: 員工編號, 姓名, 特休總時數, 休餘, 特休, 事假, 病假, 喪假, 產假, 婚假, 公假, 出差, 公傷
  * - 特休總時數: annual entitlement hours (seniority at month-end)
  * - 休餘: 特休總時數 minus 特別休假 used from hire anniversary to month-end
  * - 特休..公傷: only approved leaves whose leaveStart falls within the selected month
  */
export const generateLeaveSummaryReport = async (year: number, month: number): Promise<ExcelJS.Buffer> => {
  //  前一月 24 號 00:00 開始到這個月 23 號 23:59
  // const monthStart = new Date(year, month - 2, 24, 0, 0, 0, 0);
  // const monthEnd = new Date(year, month - 1, 23, 23, 59, 59, 999);
  const monthStart = dayjsNum(year, month - 1, 24)
  const monthEnd = dayjsNum(year, month, 23, 23, 59, 59, 999)

  // 計算特休日數時使用到的到今年底為止的才算今年特休日數
  // const annualLeaveReferenceDate = new Date(year, 11, 23, 23, 59, 59, 999);
  const annualLeaveReferenceDate = dayjsNum(year, 12, 23)

  const employees = await Employee.find({
    isActive: true,
    // 確保 hireDate 存在、不為 null，且小於基準日
    hireDate: { $exists: true, $ne: null, $lt: monthEnd.toDate() },

    // 離職日條件：沒有離職日，或者離職日大於基準日
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gt: monthEnd.toDate() } }
    ]
  }).sort({ empID: 1 });

  // Year-to-month range for 休餘 accumulation
  // const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
  const yearStart = dayjsNum(year - 1, 12, 24);

  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  console.log(monthKey)

  const [monthLeaves, yearToMonthLeaves, allAdjustments] = await Promise.all([
    Leave.find({ status: 'approved', leaveStart: { $gte: monthStart.toDate(), $lte: monthEnd.toDate() } }),
    Leave.find({ status: 'approved', leaveStart: { $gte: yearStart.toDate(), $lte: monthEnd.toDate() } }),
    LeaveAdjustment.find({})
  ]);

  const sumMinutes = (leaves: ILeave[]): number =>
    leaves.reduce((s, l) => s + parseInt(l.hour) * 60 + parseInt(l.minutes), 0);

  const reportData: any[] = [];

  for (const employee of employees) {
    const empMonthLeaves = monthLeaves.filter(l => l.empID === employee.empID);
    const empYearLeaves = yearToMonthLeaves.filter(l => l.empID === employee.empID);
    const empAdj = allAdjustments.filter(a => a.empID === employee.empID);
    const empLegacyCalc = LeaveService.getYearRanges(dayjsTz(employee.hireDate), monthEnd)
    const remain = legacyLeavejson.find(l => l.id === employee.empID)?.remain || 0;

    console.log(`emp: ${employee.id}, remain: ${remain}`)

    // 特休總時數
    const annualLeaveDays =await LeaveService.calcAnnualLeaveDaysByEmployee(employee, annualLeaveReferenceDate);

    const remainAnnualLeaveDays = await LeaveService.calcRemainAnnualLeaveDays(employee, monthEnd)

    // Monthly leave helper: system hours + legacy hours for the column
    const monthH = (dbType: string) =>
      Math.round((sumMinutes(empMonthLeaves.filter(l => l.leaveType === dbType)))) / 60;

    reportData.push({
      'empId': employee.empID,
      'name': employee.name,
      'lastYearDays': annualLeaveDays[0],
      "remain": remainAnnualLeaveDays[0],
      "t1": empLegacyCalc.lastYearStart.format('YYYY/MM/DD'),
      "t2": empLegacyCalc.lastYearEnd.format('YYYY/MM/DD'),
      "days": annualLeaveDays[2],
      "remain2": remainAnnualLeaveDays[1],
      "t3": empLegacyCalc.thisYearStart.format('YYYY/MM/DD'),
      "t4": empLegacyCalc.thisYearEnd.format('YYYY/MM/DD'),
      'totalSpecialHours': remainAnnualLeaveDays[2],
      'remainingHours': remainAnnualLeaveDays[3],
      'annualLeave': monthH('特別休假'),
      'personalLeave': monthH('事假'),
      'sickLeave': monthH('普通傷病假'),
      'funeralLeave': monthH('喪假'),
      'maternityLeave': monthH('產假'),
      'marriageLeave': monthH('婚假'),
      'officialLeave': monthH('公假'),
      'businessTrip': monthH('出差'),
      'injuryLeave': monthH('公傷病假')
    });
  }

  return await _formatOutput(reportData, `請假總表${year}${month}`);
}

const _formatOutput = async (reportData: any[], title: string): Promise<ExcelJS.Buffer> => {
  // 1. 建立新的工作簿 (Workbook)
  const workbook = new ExcelJS.Workbook();

  // 2. 新增工作表 (Worksheet)，名稱為 '請假總表'
  const worksheet = workbook.addWorksheet(title);

  worksheet.columns = [
    { header: '員工編號', key: 'empId', width: 12 },
    { header: '姓名', key: 'name', width: 10 },
    { header: `到職日前應休天數`, key: 'lastYearDays', width: 20 },
    { header: `剩餘應修時數`, key: 'remain', width: 20 },
    { header: `起`, key: 't1', width: 14 },
    { header: `迄`, key: 't2', width: 14 },
    { header: `到職日後應休天數`, key: 'days', width: 20 },
    { header: `剩餘應修時數`, key: 'remain2', width: 20 },
    { header: `起`, key: 't3', width: 14 },
    { header: `迄`, key: 't4', width: 14 },
    { header: '特休總時數', key: 'totalSpecialHours', width: 14 },
    { header: '休餘', key: 'remainingHours', width: 8 },
    { header: '特休', key: 'annualLeave', width: 8 },
    { header: '事假', key: 'personalLeave', width: 8 },
    { header: '病假', key: 'sickLeave', width: 8 },
    { header: '喪假', key: 'funeralLeave', width: 8 },
    { header: '產假', key: 'maternityLeave', width: 8 },
    { header: '婚假', key: 'marriageLeave', width: 8 },
    { header: '公假', key: 'officialLeave', width: 8 },
    { header: '出差', key: 'businessTrip', width: 8 },
    { header: '公傷', key: 'injuryLeave', width: 8 }
  ];

  //-------------
  // 設定大標題
  //-------------
  worksheet.insertRow(1, [
    '臺龍電子股份有限公司 特休表', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
  ]);
  worksheet.mergeCells(1, 1, 1, 21);
  const row1 = worksheet.getRow(1);
  row1.height = 40; // 40 到 50 的高度很適合放標題
  const cellA1 = row1.getCell(1);
  cellA1.alignment = { horizontal: 'center', vertical: 'middle' };
  cellA1.font = {
    bold: true,
    color: { argb: 'FF000000' }, // 改為黑色字 (ARGB: FF000000)
    name: '微軟正黑體',
    size: 18 // 建議 18 ~ 24 級字就很顯眼了，72 級字會太大
  };

  //-------------
  // 設定第二列標題
  //-------------
  const superHeader = [
    '員工資料', '',
    '2025年到職日前可請休天數', '', '', '',
    '2025年到職日後可請休天數', '', '', '',
    '01假況(時)', '', '', '', '', '', '', '', '', '', ''
  ];
  worksheet.insertRow(2, superHeader);
  const row2 = worksheet.getRow(2);
  row2.height = 30; // 調整大分類列高
  row2.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: '微軟正黑體' }; // 白色粗體字
  worksheet.mergeCells(2, 1, 2, 2);   // 員工資料 (Row 2, 1~2 欄)
  worksheet.mergeCells(2, 3, 2, 6);   // 到職日前 (Row 2, 3~6 欄)
  worksheet.mergeCells(2, 7, 2, 10);  // 到職日後 (Row 2, 7~10 欄)
  worksheet.mergeCells(2, 11, 2, 21); // 01假況 (Row 2, 11~21 欄)

  for (let i = 1; i <= 21; i++) {
    const cell = row2.getCell(i);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };

    if (i <= 2) {
      // 員工資料 -> RGB(75, 172, 198) = 4BAC62
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4BAC62' }
      };
    } else {
      // 其他三組 -> RGB(247, 150, 70) = F79646
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF79646' }
      };
    }
  }

  const groups = [
    { start: 1, end: 2 },   // 員工資料
    { start: 3, end: 6 },   // 到職日前
    { start: 7, end: 10 },  // 到職日後
    { start: 11, end: 21 }  // 01假況
  ];

  groups.forEach(group => {
    for (let i = group.start; i <= group.end; i++) {
      const cell = row2.getCell(i);

      // 初始化或保留原本的 border 設定
      cell.border = cell.border || {};

      // 只要是該群組的最左格，左邊界就是粗線
      cell.border.left = i === group.start
        ? { style: 'medium', color: { argb: 'FF000000' } }
        : { style: 'thin', color: { argb: 'FFCCCCCC' } };

      // 只要是該群組的最右格，右邊界就是粗線
      cell.border.right = i === group.end
        ? { style: 'medium', color: { argb: 'FF000000' } }
        : { style: 'thin', color: { argb: 'FFCCCCCC' } };

      // 上下邊界一律為粗線
      cell.border.top = { style: 'medium', color: { argb: 'FF000000' } };
      cell.border.bottom = { style: 'medium', color: { argb: 'FF000000' } };
    }
  });

  //-------------
  // 設定第三列小標題
  //-------------
  const row3 = worksheet.getRow(3);
  row3.height = 25;
  row3.font = { bold: true, name: '微軟正黑體' };
  for (let i = 1; i <= 21; i++) {
    const cell = row3.getCell(i);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };

    // 幫小標頭加上細線
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } }, // 下方用粗線切隔資料
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    };
  }

  groups.forEach(group => {
    for (let i = group.start; i <= group.end; i++) {
      const cell = row3.getCell(i);

      // 初始化或保留原本的 border 設定
      cell.border = cell.border || {};

      // 只要是該群組的最左格，左邊界就是粗線
      cell.border.left = i === group.start
        ? { style: 'medium', color: { argb: 'FF000000' } }
        : { style: 'thin', color: { argb: 'FFCCCCCC' } };

      // 只要是該群組的最右格，右邊界就是粗線
      cell.border.right = i === group.end
        ? { style: 'medium', color: { argb: 'FF000000' } }
        : { style: 'thin', color: { argb: 'FFCCCCCC' } };

      // 上下邊界一律為粗線
      cell.border.top = { style: 'medium', color: { argb: 'FF000000' } };
      cell.border.bottom = { style: 'medium', color: { argb: 'FF000000' } };
    }
  });

  // 4. 批次寫入 JSON 資料 (reportData 必須是物件陣列，裡面的 key 要與上面對應)
  worksheet.addRows(reportData);

  //-------------
  // 設定資料格式
  //-------------
  const rowCount = worksheet.getColumn('A').values.length - 1;
  const allCols = Array.from({ length: 21 }, (_, index) => String.fromCharCode(65 + index)); // 生成 ['A', 'B', ..., 'U']

  // 所有資料
  for (let i = 3; i <= rowCount; i++) {
    if (worksheet.getCell(`A${i}`)) {
      allCols.forEach(([col]) => {
        const cell = worksheet.getCell(`${col}${i}`);
        cell.border = {
          left: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } }, top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'thin', color: { argb: 'FF000000' } }
        }
        cell.font = { bold: true, name: '微軟正黑體' };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }
  }

  // 粗框線
  const borderConfig = [['A', 'left'], ['B', 'right'], ['C', 'left'], ['F', 'right'], ['G', 'left'], ['J', 'right'], ['K', 'left'], ['U', 'right']];
  for (let i = 1; i <= rowCount; i++) {
    if (worksheet.getCell(`A${i}`)) {
      borderConfig.forEach(([col, side]) => {
        const cell = worksheet.getCell(`${col}${i}`);
        cell.border = { ...cell.border, [side]: { style: 'medium', color: { argb: 'FF000000' } } };
      });
    }
  }
  allCols.forEach(col => {
    const cell = worksheet.getCell(`${col}${rowCount}`);
    cell.border = { ...cell.border, bottom: { style: 'medium', color: { argb: 'FF000000' } } };
  });

  // 設定資料顏色
  const colorConfig = [['A', 'FFFFFEDD', "FF000000"], ['B', 'FFFFFEDD', "FF000000"], ['C', 'FFC5D9F1', "FF31869B"], ['D', 'FFC5D9F1', "FF31869B"], ['G', 'FFC5D9F1', "FF31869B"], ['H', 'FFC5D9F1', "FF31869B"]].concat(Array.from({ length: 11 }, (_, index) => {
    return [String.fromCharCode(75 + index), 'FFFFFF', "FF31869B"]
  }));

  for (let i = 4; i <= rowCount; i++) {
    worksheet.getRow(i).height = 20
    if (worksheet.getCell(`A${i}`)) {
      colorConfig.forEach(([col, color, fontColor]) => {
        const cell = worksheet.getCell(`${col}${i}`);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: color }
        };
        cell.font = { bold: true, color: { argb: fontColor }, name: '微軟正黑體' };
      });
    }
  }

  // 6. 將工作簿寫入 Buffer 並返回
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;

  // const worksheet = XLSX.utils.json_to_sheet(reportData);
  // const workbook = XLSX.utils.book_new();
  // XLSX.utils.book_append_sheet(workbook, worksheet, '請假總表');

  // worksheet['!cols'] = [
  //   { wch: 12 }, // 員工編號
  //   { wch: 10 }, // 姓名
  //   { wch: 12 }, // 特休總時數
  //   { wch: 10 }, // 休餘
  //   { wch: 8 },  // 特休
  //   { wch: 8 },  // 事假
  //   { wch: 8 },  // 病假
  //   { wch: 8 },  // 喪假
  //   { wch: 8 },  // 產假
  //   { wch: 8 },  // 婚假
  //   { wch: 8 },  // 公假
  //   { wch: 8 },  // 出差
  //   { wch: 8 }   // 公傷
  // ];

  // const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  // return buffer;
}