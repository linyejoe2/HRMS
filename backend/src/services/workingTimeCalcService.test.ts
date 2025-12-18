// calcWorkingDuration.test.ts
import { calcWorkingDuration } from "./workingTimeCalcService"; // 請依據你的檔案路徑調整

describe("calcWorkingDuration (工時計算)", () => {
  
  // === 第一部分：基礎物理時間計算 (預設模式) ===
  describe("Default Mode (Physical Time)", () => {
    
    test("上午時段 (08:30-12:00) 應為 3.5 小時", () => {
      const result = calcWorkingDuration("2024-05-20 08:30", "2024-05-20 12:00");
      
      expect(result.minuteFormat).toBe(210); // 3.5 * 60
      expect(result.hourFormat).toBe(3.5);
      expect(result.crossBreaktime).toBe(0);
    });

    test("下午時段 (13:00-17:30) 應為 4.5 小時", () => {
      const result = calcWorkingDuration("2024-05-20 13:00", "2024-05-20 17:30");
      
      expect(result.minuteFormat).toBe(270); // 4.5 * 60
      expect(result.hourFormat).toBe(4.5);
      expect(result.crossBreaktime).toBe(0);
    });

    test("整天 (08:30-17:30) 應為 8 小時並包含 1 小時午休", () => {
      const result = calcWorkingDuration("2024-05-20 08:30", "2024-05-20 17:30");
      
      expect(result.minuteFormat).toBe(480); // 8 * 60
      expect(result.hourFormat).toBe(8.0);
      expect(result.crossBreaktime).toBe(60); // 12:00-13:00
    });

    test("跨午休 (11:00-14:00) 應扣除午休時間", () => {
      // 11:00-12:00 (1hr) + 12:00-13:00 (Break) + 13:00-14:00 (1hr)
      const result = calcWorkingDuration("2024-05-20 11:00", "2024-05-20 14:00");
      
      expect(result.minuteFormat).toBe(120); // 2 hours work
      expect(result.crossBreaktime).toBe(60); // 1 hour break
    });
  });

  // === 第二部分：標準化模式 (Special 4-Hour Blocks) ===
  describe("Standard 4-Hour Blocks Mode", () => {
    
    test("開啟設定後，上午時段 (08:30-12:00) 應轉為 4 小時", () => {
      const result = calcWorkingDuration("2024-05-20 08:30", "2024-05-20 12:00", {
        useStandard4HourBlocks: true
      });
      
      expect(result.minuteFormat).toBe(240); // 4 hours
      expect(result.hourFormat).toBe(4.0);
    });

    test("開啟設定後，下午時段 (13:00-17:30) 應轉為 4 小時", () => {
      const result = calcWorkingDuration("2024-05-20 13:00", "2024-05-20 17:30", {
        useStandard4HourBlocks: true
      });
      
      expect(result.minuteFormat).toBe(240); // 4 hours
      expect(result.hourFormat).toBe(4.0);
    });

    test("開啟設定後，整天依然維持 8 小時 (4+4)", () => {
      const result = calcWorkingDuration("2024-05-20 08:30", "2024-05-20 17:30", {
        useStandard4HourBlocks: true
      });
      
      expect(result.hourFormat).toBe(8.0);
    });

    test("開啟設定後，比例計算是否正確 (例如只請上午的一半)", () => {
      // 上午總長 210分，請假 08:30-10:15 (105分，剛好一半)
      // 預期結果：標準化4小時的一半 = 2小時
      const result = calcWorkingDuration("2024-05-20 08:30", "2024-05-20 10:15", {
        useStandard4HourBlocks: true
      });
      
      expect(result.minuteFormat).toBe(120); // 2 hours
      expect(result.hourFormat).toBe(2.0);
    });
  });

  // === 第三部分：假日與跨日邏輯 ===
  describe("Holidays & Cross Day", () => {
    
    test("週末 (週六) 不應計算工時，應計入 crossHoliday", () => {
      // 2024-05-18 是週六
      const result = calcWorkingDuration("2024-05-18 08:30", "2024-05-18 17:30");
      
      expect(result.minuteFormat).toBe(0);
      expect(result.crossHoliday).toBeGreaterThan(0); 
    });

    test("國定假日 (傳入參數) 不應計算工時", () => {
      // 2024-05-22 (週三) 假設為突發假
      const holidays = ["2024-05-22"];
      const result = calcWorkingDuration("2024-05-22 08:30", "2024-05-22 17:30", { holidays });
      
      expect(result.minuteFormat).toBe(0);
      expect(result.crossHoliday).toBeGreaterThan(0);
    });

    test("跨日請假 (兩天整天)", () => {
      // 週一 08:30 到 週二 17:30
      const result = calcWorkingDuration("2024-05-20 08:30", "2024-05-21 17:30");
      
      expect(result.hourFormat).toBe(16.0); // 8 + 8
      expect(result.crossBreaktime).toBe(120); // 60 + 60
      expect(result.crossNight).toBeGreaterThan(0); // 包含第一天晚上到第二天早上的時間
    });
    
    test("跨越非工作時間 (CrossNight Check)", () => {
        // 週一 17:30 到 週二 08:30 (完全是非工作時間)
        const result = calcWorkingDuration("2024-05-20 17:30", "2024-05-21 08:30");
        
        expect(result.minuteFormat).toBe(0);
        expect(result.crossNight).toBeGreaterThan(0);
    });
  });

  // === 第四部分：異常處理 ===
  describe("Edge Cases", () => {
    test("結束時間早於開始時間應回傳 0", () => {
      const result = calcWorkingDuration("2024-05-20 12:00", "2024-05-20 09:00");
      expect(result.minuteFormat).toBe(0);
    });

    test("無效日期字串應拋出錯誤", () => {
      expect(() => {
        calcWorkingDuration("invalid-date", "2024-05-20");
      }).toThrow("Invalid date format");
    });
  });

});