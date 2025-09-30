import { calcWarkingDurent } from './utility';

describe('calcWarkingDurent', () => {
  // Test basic functionality within working hours
  describe('Basic working hours calculation', () => {
    test('should calculate duration within morning work period', () => {
      const from = '2025-09-30T00:30:00.000Z'; // 08:30 Taipei time
      const to = '2025-09-30T03:00:00.000Z';   // 11:00 Taipei time

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(150); // 2.5 hours = 150 minutes
      expect(result.crossBreaktime).toBe(0);
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(0);
    });

    test('should calculate duration within afternoon work period', () => {
      const from = '2025-09-30T05:00:00.000Z'; // 13:00 Taipei time
      const to = '2025-09-30T07:30:00.000Z';   // 15:30 Taipei time

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(150); // 2.5 hours = 150 minutes
      expect(result.crossBreaktime).toBe(0);
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(0);
    });

    test('should calculate full day work duration', () => {
      const from = '2025-09-30T00:30:00.000Z'; // 08:30 Taipei time
      const to = '2025-09-30T09:30:00.000Z';   // 17:30 Taipei time

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(480); // 8 hours = 480 minutes (3.5h + 4.5h)
      expect(result.crossBreaktime).toBe(60); // crosses lunch break
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(0);
    });
  });

  // Test cross-break functionality
  describe('Cross-break calculation', () => {
    test('should detect crossing lunch break', () => {
      const from = '2025-09-30T03:00:00.000Z'; // 11:00 Taipei time
      const to = '2025-09-30T06:00:00.000Z';   // 14:00 Taipei time

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(120); // 1h before lunch + 1h after lunch = 120 minutes
      expect(result.crossBreaktime).toBe(60); // crosses lunch break
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(0);
    });

    test('should not detect crossing lunch break if entirely before lunch', () => {
      const from = '2025-09-30T00:30:00.000Z'; // 08:30 Taipei time
      const to = '2025-09-30T03:30:00.000Z';   // 11:30 Taipei time

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(180);
      expect(result.crossBreaktime).toBe(0); // does not cross lunch
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(0);
    });

    test('should not detect crossing lunch break if entirely after lunch', () => {
      const from = '2025-09-30T06:00:00.000Z'; // 14:00 Taipei time
      const to = '2025-09-30T08:30:00.000Z';   // 16:30 Taipei time

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(150); // 2.5 hours = 150 minutes
      expect(result.crossBreaktime).toBe(0); // does not cross lunch
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(0);
    });
  });

  // Test weekend calculation
  describe('Weekend calculation', () => {
    test('should calculate weekend as holiday time (Saturday)', () => {
      const from = '2025-10-04T00:30:00.000Z'; // Saturday 08:30 Taipei time
      const to = '2025-10-04T09:30:00.000Z';   // Saturday 17:30 Taipei time

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(0); // No work duration on weekends
      expect(result.crossBreaktime).toBe(0);
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(1440); // 24 hours = 1440 minutes
    });

    test('should calculate weekend as holiday time (Sunday)', () => {
      const from = '2025-10-05T00:30:00.000Z'; // Sunday 08:30 Taipei time
      const to = '2025-10-05T09:30:00.000Z';   // Sunday 17:30 Taipei time

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(0); // No work duration on weekends
      expect(result.crossBreaktime).toBe(0);
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(1440); // 24 hours = 1440 minutes
    });
  });

  // Test cross-night calculation
  describe('Cross-night calculation', () => {
    test('should calculate cross-night duration for multi-day span', () => {
      const from = '2025-09-30T00:30:00.000Z'; // Monday 08:30 Taipei time
      const to = '2025-10-01T09:30:00.000Z';   // Tuesday 17:30 Taipei time

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(960); // 8 hours Monday + 8 hours Tuesday = 960 minutes
      expect(result.crossBreaktime).toBe(60); // crosses lunch break on Tuesday
      expect(result.crossNight).toBe(900); // 15 hours non-work time = 900 minutes
      expect(result.crossholiday).toBe(0);
    });

    test('should handle span across weekend', () => {
      const from = '2025-10-03T00:30:00.000Z'; // Friday 08:30 Taipei time
      const to = '2025-10-06T09:30:00.000Z';   // Monday 17:30 Taipei time

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(960); // 8 hours Friday + 8 hours Monday = 960 minutes
      expect(result.crossBreaktime).toBe(60); // crosses lunch break on Monday
      expect(result.crossNight).toBe(900); // 15 hours * 1 night (Friday->Monday) = 900 minutes
      expect(result.crossholiday).toBe(2880); // 48 hours weekend = 2880 minutes
    });
  });

  // Test edge cases
  describe('Edge cases', () => {
    test('should return zero duration for same time', () => {
      const time = '2025-09-30T00:30:00.000Z';

      const result = calcWarkingDurent(time, time);

      expect(result.durent).toBe(0);
      expect(result.crossBreaktime).toBe(0);
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(0);
    });

    test('should return zero duration when end is before start', () => {
      const from = '2025-09-30T09:30:00.000Z'; // 17:30 Taipei time
      const to = '2025-09-30T00:30:00.000Z';   // 08:30 Taipei time

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(0);
      expect(result.crossBreaktime).toBe(0);
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(0);
    });

    test('should handle time outside working hours', () => {
      const from = '2025-09-29T22:00:00.000Z'; // 06:00 Taipei time (before work)
      const to = '2025-09-30T00:00:00.000Z';   // 08:00 Taipei time (before work)

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(0); // No working hours covered
      expect(result.crossBreaktime).toBe(0);
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(0);
    });

    test('should handle time partially overlapping work hours', () => {
      const from = '2025-09-29T23:00:00.000Z'; // 07:00 Taipei time
      const to = '2025-09-30T01:00:00.000Z';   // 09:00 Taipei time

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(30); // 08:30-09:00 = 30 minutes
      expect(result.crossBreaktime).toBe(0);
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(0);
    });

    test('should throw error for invalid date format', () => {
      expect(() => {
        calcWarkingDurent('invalid-date', '2025-09-30T09:30:00.000Z');
      }).toThrow('Invalid date format');
    });

    test('should throw error for invalid end date', () => {
      expect(() => {
        calcWarkingDurent('2025-09-30T00:30:00.000Z', 'invalid-date');
      }).toThrow('Invalid date format');
    });
  });

  // Test specific business scenarios
  describe('Business scenarios', () => {
    test('should calculate overtime work period', () => {
      const from = '2025-09-30T00:30:00.000Z'; // 08:30 Taipei time
      const to = '2025-09-30T11:00:00.000Z';   // 19:00 Taipei time (overtime)

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(480); // Only counts normal working hours (8 hours)
      expect(result.crossBreaktime).toBe(60); // crosses lunch break
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(0);
    });

    test('should handle early arrival and late departure', () => {
      const from = '2025-09-29T23:00:00.000Z'; // 07:00 Taipei time (early)
      const to = '2025-09-30T11:00:00.000Z';   // 19:00 Taipei time (late)

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(480); // Only counts normal working hours
      expect(result.crossBreaktime).toBe(60); // crosses lunch break
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(0);
    });

    test('should handle lunch-only presence', () => {
      const from = '2025-09-30T03:30:00.000Z'; // 11:30 Taipei time
      const to = '2025-09-30T05:30:00.000Z';   // 13:30 Taipei time

      const result = calcWarkingDurent(from, to);

      expect(result.durent).toBe(60); // 30 min before lunch + 30 min after lunch
      expect(result.crossBreaktime).toBe(60); // crosses lunch break
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(0);
    });
  });
});