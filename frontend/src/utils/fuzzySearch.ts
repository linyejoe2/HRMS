import { getDepartmentDescription } from "@/services/variableService";

/**
 * 通用多關鍵字模糊搜尋函式 (AND 邏輯)
 * * @param record 要被搜尋的原始資料物件 (可以是任何型態 T)
 * @param searchQuery 以空格分隔的搜尋字串
 * @param getSearchableTexts 回呼函式，用來定義該物件有哪些欄位需要被搜尋
 * @returns {boolean} 是否符合搜尋條件
 */
export const fuzzySearch = <T>(
  record: T,
  searchQuery: string,
  getSearchableTexts: (rec: T) => (string | number | undefined | null)[]
): boolean => {
  if (!searchQuery || searchQuery.trim() === '') {
    return true; // 沒有搜尋條件，預設全過
  }

  // 切分關鍵字並過濾空字串
  const keywords = searchQuery.trim().toLowerCase().split(/\s+/).filter(k => k.length > 0);
  if (keywords.length === 0) {
    return true;
  }

  // 取得所有需要比對的目標字串，並統一轉成小寫
  const targetTexts = getSearchableTexts(record)
    .map(text => (text?.toString() || '').toLowerCase());

  // 所有的關鍵字都必須符合 (AND 邏輯)
  return keywords.every(keyword => 
    // 該關鍵字只要符合其中一個欄位即可 (OR 邏輯)
    targetTexts.some(text => text.includes(keyword))
  );
};
// 定義你原本的資料型態
interface AttendanceRecord {
  cardID?: string;
  employeeName?: string;
  department?: string;
}

interface ApprovalRecord {
  sequenceNumber?: number;
  name?: string;
  department?: string;
}

/**
 * 出勤紀錄搜尋
 */
export const fuzzySearchAttendance = (
  record: AttendanceRecord,
  searchQuery: string,
  empID: string
): boolean => {
  return fuzzySearch(record, searchQuery, (rec) => [
    rec.cardID,
    empID, // 外部傳入的 empID
    rec.employeeName,
    rec.department,
    getDepartmentDescription(rec.department || '')
  ]);
};

/**
 * 簽核清單搜尋
 */
export const fuzzySearchApproval = (
  record: ApprovalRecord,
  searchQuery: string
): boolean => {
  return fuzzySearch(record, searchQuery, (rec) => [
    rec.sequenceNumber,
    rec.name,
    rec.department,
    getDepartmentDescription(rec.department || '')
  ]);
};