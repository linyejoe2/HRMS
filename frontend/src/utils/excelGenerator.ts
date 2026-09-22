import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { BusinessTripRequest } from '../types';

// Downloads a per-day breakdown of a business trip's recorded clock-in/out times.
// No-op when there's nothing recorded yet, since an empty workbook isn't useful.
export const generateBusinessTripClockTimesExcel = (businessTripRequest: BusinessTripRequest): void => {
  const clockTimes = businessTripRequest.clockTimes;
  if (!clockTimes || clockTimes.length === 0) return;

  const excelData = clockTimes.map((entry, index) => ({
    '編號': `#${businessTripRequest.sequenceNumber || 'N/A'}`,
    '員工編號': businessTripRequest.empID,
    '姓名': businessTripRequest.name,
    '目的地': businessTripRequest.destination,
    '洽辦對象': businessTripRequest.contactPerson || '-',
    '天數': `第 ${index + 1} 天`,
    '日期': dayjs(entry.clockIn).format('YYYY/MM/DD'),
    '上班時間': dayjs(entry.clockIn).format('HH:mm'),
    '下班時間': dayjs(entry.clockOut).format('HH:mm')
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  worksheet['!cols'] = [
    { wch: 10 }, // 編號
    { wch: 10 }, // 員工編號
    { wch: 10 }, // 姓名
    { wch: 14 }, // 目的地
    { wch: 14 }, // 洽辦對象
    { wch: 8 },  // 天數
    { wch: 12 }, // 日期
    { wch: 10 }, // 上班時間
    { wch: 10 }  // 下班時間
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '上下班時間');

  const startDate = dayjs(businessTripRequest.tripStart).format('YYYY_MM_DD');
  const filename = `因公免刷卡上下班時間_${startDate}_${businessTripRequest.name}.xlsx`;

  XLSX.writeFile(workbook, filename);
};
