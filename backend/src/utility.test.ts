import { calcWarkingDurent } from './utility';

describe('calcWarkingDurent', () => {
  // Test basic functionality within working hours
  describe('Basic working hours calculation', () => {
    test('should calculate duration within morning work period', () => {
      const from = '2025-09-30T00:30:00.000Z'; // 08:30 Taipei time
      const to = '2025-09-31T09:20:00.000Z';   // 11:00 Taipei time

      const result = calcWarkingDurent(from, to);

      console.log(result)

      expect(result.durent).toBe(150); // 2.5 hours = 150 minutes
      expect(result.crossBreaktime).toBe(0);
      expect(result.crossNight).toBe(0);
      expect(result.crossholiday).toBe(0);
    });

    test('2', () => {
      const from = 'Fri, 07 Nov 2025 00:30:00 GMT'; // 08:30 Taipei time
      const to = 'vri, 07 Nov 2025 09:20:00 GMT';   // 11:00 Taipei time

      const result = calcWarkingDurent(from, to);

      console.log(result)
    });
  })
});