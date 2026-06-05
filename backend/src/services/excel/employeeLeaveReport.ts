import ExcelJS from 'exceljs';
import legacyLeave from "../../config/legacyLeave.json"
import { Employee, IEmployee, ILeave, Leave, LeaveAdjustment, LegacyLeave } from '../../models';
import { LeaveService } from '../leaveService';
import { APIError } from '../../middleware';

/**
  * Generate 請假表 (Individual Employee Leave Report) Excel for a given employee and date range
  */
export const generateEmployeeLeaveReport = async (empID: string, startDate: string, endDate: string): Promise<ExcelJS.Buffer> => {
  const employee = await Employee.findOne({ empID });
  if (!employee) {
    throw new APIError('Employee not found', 404);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const year = start.getFullYear();
  const month = start.getMonth() + 1;
  const endYear = end.getFullYear();
  const endMonth = end.getMonth() + 1;


  const reportName = `${employee.name}${year}年${month}月到${endYear}年${endMonth}月請假表`

  // Get all approved leave requests for this employee in the date range
  const leaves = await Leave.find({
    empID,
    status: 'approved',
    $or: [
      { leaveStart: { $gte: start, $lte: end } },
      { leaveEnd: { $gte: start, $lte: end } },
      { leaveStart: { $lte: start }, leaveEnd: { $gte: end } }
    ]
  }).sort({ sequenceNumber: 1 });

  const remain = legacyLeave.find(l => l.id === employee.empID)?.remain || 0;
  console.log("remain: ", remain)
  const annualLeaveDays = LeaveService.calcAnnualLeaveDaysByEmployee(employee, end);
  const yearRange = LeaveService.getYearRanges(employee.hireDate, end);
  const annualLeaveUsed = annualLeaveDays[1] - remain;

  // Build report data
  const reportData: any[] = leaves.map(leave => {
    const leaveStartDate = new Date(leave.leaveStart);
    const leaveEndDate = new Date(leave.leaveEnd);
    const duration = parseInt(leave.hour) + (parseInt(leave.minutes) / 60)
    const annualLeaveDuration = leave.leaveType == "特別休假" ? duration : 0

    const endMonth = String(leave.leaveEnd.getMonth() + 1).padStart(2, '0');
    const endDay = String(leave.leaveEnd.getDate()).padStart(2, '0');


    return {
      "起": leave.mm + "月" + leave.DD + "日",
      "迄": endMonth + "月" + endDay + "日",
      '請假事由': leave.reason || '',
      '請假類型': leave.leaveType,
      "特休": annualLeaveDuration,
      "特休已休累計": annualLeaveUsed,
      "剩餘特休時數": remain - annualLeaveDuration,
      '時數': duration,
      '開始時間': leaveStartDate.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      '結束時間': leaveEndDate.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      "leaveStartDate": leaveStartDate,
      '審核人': leave.approvedBy || ''
    };
  });

  const metaData = {
    annualLeaveDays: annualLeaveDays,
    yearRange: yearRange,
    annualLeaveUsed: annualLeaveUsed,
    remain: remain,
    lastYearEnd: new Date(yearRange.lastYearEnd),
    year: year
  }

  return await _formatOutput(reportData, { employee: employee, metaData: metaData }, reportName)
}

const _formatOutput = async (reportData: any[], employeeDate: { employee: IEmployee, metaData: any }, title: string): Promise<ExcelJS.Buffer> => {

  // 1. 建立新的工作簿 (Workbook)
  const workbook = new ExcelJS.Workbook();

  // 2. 新增工作表 (Worksheet)，名稱為 '請假總表'
  const worksheet = workbook.addWorksheet(title);

  const metaData = [
    ["A1", "卡號："],
    ["B1", employeeDate.employee.empID],
    ["C1", "單位："],
    ["D1", employeeDate.employee.department || ""],
    ["E1", "特休日數"],
    ["F1", employeeDate.metaData.annualLeaveDays[0]],
    ["G1", "補休"],
    ["H1", employeeDate.metaData.yearRange.lastYearStart],
    ["I1", employeeDate.metaData.yearRange.lastYearEnd],
    ["J1", ""],
    ["K1", "卡號："],
    ["L1", employeeDate.employee.empID],
    ["M1", "單位："],
    ["N1", employeeDate.employee.department || ""],
    ["O1", "特休日數"],
    ["P1", employeeDate.metaData.annualLeaveDays[2]],
    ["Q1", "補休"],
    ["R1", employeeDate.metaData.yearRange.thisYearStart],
    ["S1", employeeDate.metaData.yearRange.thisYearEnd],

    ["A2", "姓名"],
    ["B2", employeeDate.employee.name],
    ["C2", ""],
    ["D2", ""],
    ["E2", "特休小時數"],
    ["F2", employeeDate.metaData.annualLeaveDays[1]],
    ["G2", ""],
    ["H2", ""],
    ["I2", ""],
    ["J2", ""],
    ["K2", "姓名"],
    ["L2", employeeDate.employee.name],
    ["M2", ""],
    ["N2", ""],
    ["O2", "特休小時數"],
    ["P2", employeeDate.metaData.annualLeaveDays[3]],
    ["Q2", ""],
    ["R2", ""],
    ["S2", ""],

    ["A3", ""], ["B3", ""], ["C3", ""], ["D3", ""], ["E3", ""], ["F3", ""], ["G3", ""], ["H3", ""], ["I3", ""], ["J3", ""], ["K3", ""], ["L3", ""], ["M3", ""], ["N3", ""], ["O3", ""], ["P3", ""], ["Q3", ""], ["R3", ""], ["S3", ""],

    // 起 訖 事 病 其他 其他 特休 特休已休累計 剩餘特休時數  (修正了原稿中 F3, P3 錯字為 F4, P4)
    ["A4", "起"], ["B4", "迄"], ["C4", "事"], ["D4", "病"], ["E4", "其他"], ["F4", "其他"], ["G4", "特休"], ["H4", "特休已休累計"], ["I4", "剩餘特休時數"],
    ["J4", ""],
    ["K4", "起"], ["L4", "迄"], ["M4", "事"], ["N4", "病"], ["O4", "其他"], ["P4", "其他"], ["Q4", "特休"], ["R4", "特休已休累計"], ["S4", "剩餘特休時數"],

    ["A5", `${employeeDate.metaData.year}年度已請時數`], ["B5", ""], ["C5", ""], ["D5", ""], ["E5", ""], ["F5", ""],
    ["G5", employeeDate.metaData.annualLeaveUsed],
    ["H5", employeeDate.metaData.annualLeaveUsed],
    ["I5", employeeDate.metaData.remain]
  ];

  // 3. 簡單直覺地直接填入每一格
  metaData.forEach(([cellRef, value]) => {
    worksheet.getCell(cellRef).value = value;
  });


  // 114年度已請時數欄位合併
  worksheet.mergeCells("A5:B5")


  // 填入 Data
  let iA = 6, iK = 5
  // const columnAs = ["A", "B", "C", "D", "E", "F", "G", "H", "I"]
  // const columnKs = ["K", "L", "M", "N", "O", "P", "Q", "R", "S"]

  for (const row of reportData) {
    if (row.leaveStartDate <= employeeDate.metaData.lastYearEnd) {
      worksheet.getCell(`A${iA}`).value = row["起"];
      worksheet.getCell(`B${iA}`).value = row["迄"];
      worksheet.getCell(`E${iA}`).value = row["請假事由"];

      const prevUsed = worksheet.getCell(`H${iA - 1}`).value;
      const prevRemain = worksheet.getCell(`I${iA - 1}`).value;
      const hours = parseInt(row["時數"]) || 0;
      const leaveType = row["請假類型"];

      // Mapping leave types to specific column letters
      const typeToColumn: Record<string, string> = { "事假": "C", "普通傷病假": "D", "特別休假": "G" };

      if (leaveType in typeToColumn) {
        worksheet.getCell(`${typeToColumn[leaveType]}${iA}`).value = row["時數"];

        if (leaveType === "特別休假") {
          const baseRemain = typeof prevRemain === 'number' ? prevRemain : (parseInt(employeeDate.metaData.annualLeaveDays[1]) || 0);
          worksheet.getCell(`H${iA}`).value = hours + (typeof prevUsed === 'number' ? prevUsed : 0);
          worksheet.getCell(`I${iA}`).value = baseRemain - hours;
        } else {
          // For "事假" and "普通傷病假", simply pass forward the previous valid values
          if (typeof prevUsed === 'number') worksheet.getCell(`H${iA}`).value = prevUsed;
          if (typeof prevRemain === 'number') worksheet.getCell(`I${iA}`).value = prevRemain;
        }
      } else worksheet.getCell(`F${iA}`).value = `${leaveType}${row["時數"]}`;

      iA++
    } else {
      worksheet.getCell(`K${iK}`).value = row["起"];
      worksheet.getCell(`L${iK}`).value = row["迄"];
      worksheet.getCell(`O${iK}`).value = row["請假事由"];

      const cellValue = worksheet.getCell(`R${iK - 1}`).value as string;
      const prevUsed = Number.isNaN(parseInt(cellValue)) ? 0 : parseInt(cellValue);
      const prevRemain = worksheet.getCell(`S${iK - 1}`).value;
      const hours = parseInt(row["時數"]) || 0;
      const leaveType = row["請假類型"];

      // Mapping leave types to specific column letters
      const typeToColumn: Record<string, string> = { "事假": "M", "普通傷病假": "N", "特別休假": "Q" };

      if (leaveType in typeToColumn) {
        worksheet.getCell(`${typeToColumn[leaveType]}${iK}`).value = row["時數"];

        if (leaveType === "特別休假") {
          const baseRemain = typeof prevRemain === 'number' ? prevRemain : (parseInt(employeeDate.metaData.annualLeaveDays[3]) || 0);
          worksheet.getCell(`R${iK}`).value = hours + (typeof prevUsed === 'number' ? prevUsed : 0);
          worksheet.getCell(`S${iK}`).value = baseRemain - hours;
        } else {
          // For "事假" and "普通傷病假", simply pass forward the previous valid values
          if (typeof prevUsed === 'number') worksheet.getCell(`R${iK}`).value = prevUsed;
          if (typeof prevRemain === 'number') worksheet.getCell(`S${iK}`).value = prevRemain;
        }
      } else worksheet.getCell(`F${iK}`).value = `${leaveType}${row["時數"]}`;

      iK++
    }
  }


  // 4. 將工作簿寫入 Buffer 並回傳
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}