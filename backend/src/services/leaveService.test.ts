import { IEmployee, LeaveAdjustment } from '../models';
import { LeaveService } from './leaveService';
import { dayjsNum } from '../util/utility';

jest.mock('../models', () => {
  const actual = jest.requireActual('../models');
  return {
    ...actual,
    LeaveAdjustment: { find: jest.fn() }
  };
});

const employee = {
  empID: 'A541',
  name: '林詩文',
  hireDate: dayjsNum(2025, 7, 24).toDate()
} as IEmployee;

const adjustment = (effectiveDate: ReturnType<typeof dayjsNum>, minutes = 3360) => ({
  effectiveDate: effectiveDate.toDate(),
  minutes
});

describe('LeaveService.calcAnnualLeaveDaysByEmployee', () => {
  beforeEach(() => {
    jest.mocked(LeaveAdjustment.find).mockResolvedValue([
      adjustment(dayjsNum(2026, 6, 16))
    ] as never);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calculates A541 previous anniversary entitlement as three days plus 56 adjusted hours', async () => {
    await expect(
      LeaveService.calcAnnualLeaveDaysByEmployee(employee, dayjsNum(2026, 12, 24))
    ).resolves.toEqual([10, 80, 7, 56]);
  });

  it.each([
    [dayjsNum(2026, 1, 23), 0],
    [dayjsNum(2026, 1, 24), 3],
    [dayjsNum(2026, 7, 23), 3],
    [dayjsNum(2026, 7, 24), 7]
  ])('uses actual calendar-date seniority on %s', (referenceDate, expectedDays) => {
    expect(
      LeaveService.calcAnnualLeaveEntitlementDays(employee.hireDate!, referenceDate)
    ).toBe(expectedDays);
  });

  it('assigns adjustments on the anniversary boundary to their matching ranges', async () => {
    jest.mocked(LeaveAdjustment.find).mockResolvedValue([
      adjustment(dayjsNum(2026, 7, 23)),
      adjustment(dayjsNum(2026, 7, 24))
    ] as never);

    await expect(
      LeaveService.getAdjustedAnnualLeaveHours(employee, dayjsNum(2026, 12, 24))
    ).resolves.toMatchObject({
      lastYearDays: 7,
      thisYearDays: 7
    });
  });
});
