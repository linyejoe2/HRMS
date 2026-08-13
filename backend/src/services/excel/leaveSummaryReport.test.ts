import ExcelJS from 'exceljs';

jest.mock('../../models', () => ({
  Employee: { find: jest.fn() },
  Leave: { find: jest.fn() },
  LeaveAdjustment: { find: jest.fn() }
}));

jest.mock('../leaveService', () => ({
  LeaveService: {
    getYearRanges: jest.fn(() => ({
      lastYearStart: { format: () => '2025/07/24' },
      lastYearEnd: { format: () => '2026/07/23' },
      thisYearStart: { format: () => '2026/07/24' },
      thisYearEnd: { format: () => '2027/07/23' }
    })),
    calcAnnualLeaveDaysByEmployee: jest.fn(async () => [3, 24, 7, 56]),
    calcRemainAnnualLeaveDays: jest.fn(async () => [24, 56, 80, 80])
  }
}));

jest.mock('../returnTaiwanLeaveService', () => ({
  ReturnTaiwanLeaveService: {
    getBalance: jest.fn(async () => ({ eligible: false, totalHours: 0, remainingHours: 0, usedHours: 0 }))
  }
}));

import { Employee, Leave, LeaveAdjustment } from '../../models';
import { generateLeaveSummaryReport } from './leaveSummaryReport';

const employee = {
  empID: 'A541',
  name: '林詩文',
  hireDate: new Date('2025-07-23T16:00:00.000Z')
};

const approvedLeave = {
  empID: 'A541',
  leaveType: '公傷病假',
  hour: '2',
  minutes: '30'
};

describe('generateLeaveSummaryReport', () => {
  beforeEach(() => {
    jest.mocked(Employee.find).mockReturnValue({ sort: jest.fn().mockResolvedValue([employee]) } as never);
    jest.mocked(Leave.find).mockResolvedValue([approvedLeave] as never);
    jest.mocked(LeaveAdjustment.find).mockResolvedValue([] as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('writes injury leave before an empty remarks column', async () => {
    const buffer = await generateLeaveSummaryReport(2026, 7);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as ArrayBuffer);
    const worksheet = workbook.worksheets[0];

    expect(worksheet.getCell('V3').value).toBe('公傷');
    expect(worksheet.getCell('W3').value).toBe('備註');
    expect(worksheet.getCell('V4').value).toBe(2.5);
    expect(worksheet.getCell('W4').value).toBe('');
    expect(worksheet.pageSetup.printArea).toBe('A1:W18');
  });

  it('keeps remarks empty in dynamically inserted rows', async () => {
    const employees = Array.from({ length: 16 }, (_, index) => ({
      ...employee,
      empID: `A${String(index + 1).padStart(3, '0')}`
    }));
    jest.mocked(Employee.find).mockReturnValue({ sort: jest.fn().mockResolvedValue(employees) } as never);

    const buffer = await generateLeaveSummaryReport(2026, 7);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as ArrayBuffer);
    const worksheet = workbook.worksheets[0];

    expect(worksheet.getCell('W19').value).toBe('');
    expect(worksheet.pageSetup.printArea).toBe('A1:W19');
  });
});
