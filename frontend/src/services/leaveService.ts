import { api } from './api';
import { LeaveRequest, LeaveAdjustment } from '../types';

export const leaveDisplaynameConverter = (type: string): string => {
  switch (type) {
    case "普通傷病假":
      return "病假"
    case "特別休假":
      return "特休"
    default:
      return type
  }
}

export const RESERVATION_LEAVE_TYPES: { type: string; displayName: string }[] = [
  { type: '婚假', displayName: '婚假' },
  { type: '喪假', displayName: '喪假' },
  { type: '生理假', displayName: '生理假' },
  { type: '公傷病假', displayName: '公傷病假' },
  { type: '公假', displayName: '公假' },
  { type: '產假', displayName: '產假' },
  { type: '產檢假', displayName: '產檢假' },
  { type: '陪產檢及陪產假', displayName: '陪產檢及陪產假' },
  { type: '安胎休養請假', displayName: '安胎休養請假' },
  { type: '育嬰留職停薪', displayName: '育嬰留職停薪' },
];

export const ReservationLeaveTypes = [
  '婚假',
  '喪假',
  '生理假',
  // '普通傷病假(住院)',
  '公假',
  '公傷病假',
  '產假',
  '產檢假',
  '陪產檢及陪產假',
  // '家庭照顧假',
  '安胎休養請假',
  '育嬰留職停薪'
];

export const LeaveTypes = [
  '普通傷病假',
  '事假',
  '特別休假',
  ...ReservationLeaveTypes
];

export interface LeaveBenefitSection {
  title: string;
  content: string;
}

export const leaveBenefitSections: LeaveBenefitSection[] = [
  { title: '事假', content: '勞工請假規則第7條：「勞工因有事故必須親自處理者，得請事假，\n一年內合計不得超過十四日。事假期間不給工資。」' },
  {
    title: '病假', content: `勞工請假規則第4條：「
勞工因普通傷害、疾病或生理原因必須治療或休養者，得在左列規定範圍內請普通傷病假：
一、未住院者，一年內合計不得超過三十日。
二、住院者，二年內合計不得超過一年。
三、未住院傷病假與住院傷病假二年內合計不得超過一年。
經醫師診斷，罹患癌症（含原位癌）採門診方式治療或懷孕期間需安胎休養者，其治療或休養期間，併入住院傷病假計算。
普通傷病假一年內未超過三十日部分，工資折半發給，其領有勞工保險普通傷病給付未達工資半數者，由雇主補足之。」` }, {
    title: '特休', content: `勞動基準法第38條：「
勞工在同一雇主或事業單位，繼續工作滿一定期間者，應依下列規定給予特別休假：
一、六個月以上一年未滿者，三日。
二、一年以上二年未滿者，七日。
三、二年以上三年未滿者，十日。
四、三年以上五年未滿者，每年十四日。
五、五年以上十年未滿者，每年十五日。
六、十年以上者，每一年加給一日，加至三十日為止。」

參考勞動基準法第 38 條第 4 項，期滿未休完之特別休假將以時薪轉換為工資發放。` },
  {
    title: '婚假', content: `勞工請假規則第2條：「勞工結婚者給予婚假八日，工資照給。」
  勞動條3字第1040130270號令：「婚假可自結婚登記之日前十日起三個月內請畢。但經雇主同意者，得於一年內請畢。」` },
  {
    title: '喪假', content: `勞工請假規則第3條：「勞工喪假依左列規定：
一、父母、養父母、繼父母、配偶喪亡者，給予喪假八日，工資照給。
二、祖父母、子女、配偶之父母、配偶之養父母或繼父母喪亡者，給予喪假六日，工資照給。
三、曾祖父母、兄弟姊妹、配偶之祖父母喪亡者，給予喪假三日，工資照給。」` },
  { title: '生理假', content: '性別平等工作法第14條：「女性受僱者因生理日致工作有困難者，每月得請生理假一日，全年請假日數未超過三日，不併入病假計算，其餘日數併入普通傷病假計算。」' },
  { title: '公假', content: '勞工請假規則第8條：「勞工依法令規定應給公假者，工資照給。」' },
  {
    title: '公傷病假', content: `勞工請假規則第6條：「勞工因職業災害而致失能、傷害或疾病者，其治療、休養期間，給予公傷病假。」
    勞動基準法第59條第2款：「勞工在醫療中不能工作時，雇主應按其原領工資數額予以補償。」` },
  {
    title: '產假', content: `勞動基準法第50條：「
女工分娩前後，應停止工作，給予產假八星期；妊娠三個月以上流產者，應停止工作，給予產假四星期。
前項女工受僱工作在六個月以上者，停止工作期間工資照給；未滿六個月者減半發給。」

性別平等工作法第15條另規定：妊娠二個月以上未滿三個月流產者，應使其停止工作，給予產假一星期；
妊娠未滿二個月流產者，應使其停止工作，給予產假五日。` },
  { title: '產檢假', content: '性別平等工作法第15條第4項：「受僱者妊娠期間，雇主應給予產檢假七日。」\n同條第6項：「產檢假、陪產檢及陪產假期間，薪資照給。」' },
  { title: '陪產檢及陪產假', content: '性別平等工作法第15條第5項：「受僱者陪伴其配偶妊娠產檢或分娩時，雇主應給予陪產檢及陪產假七日。」\n同條第6項：「產檢假、陪產檢及陪產假期間，薪資照給。」' },
  { title: '安胎休養請假', content: '性別平等工作法第15條第3項：「受僱者經醫師診斷需安胎休養者，其治療、照護或休養期間之請假及薪資計算，依相關法令之規定。」\n\n參考勞工請假規則第4條，安胎休養併入住院傷病假（二年內合計不得超過一年）。薪資部分，一年內未超過三十日部分工資折半發給。' },
  {
    title: '育嬰留職停薪', content: `性別平等工作法第16條：「受僱者任職滿六個月後，於每一子女滿三歲前，得申請育嬰留職停薪，期間至該子女滿三歲止，但不得逾二年。同時撫育子女二人以上者，其育嬰留職停薪期間應合併計算，最長以最幼子女受撫育二年為限。」

育嬰留職停薪實施辦法第2條：「育嬰留職停薪期間，新增受僱者得以日為單位，申請育嬰留職停薪，
但合併計算不得超過三十日，並應於五日前向雇主提出申請。」

就業保險法第11條第1款：「育嬰留職停薪津貼：被保險人之保險年資合計滿一年以上，子女滿三歲前，依性別工作平等法之規定，辦理育嬰留職停薪。」` }
];

// LeaveTypes values don't always match leaveBenefitSections titles 1:1 (e.g. '普通傷病假' vs '病假').
const LEAVE_TYPE_TO_BENEFIT_TITLE: Record<string, string> = {
  '普通傷病假': '病假',
  '特別休假': '特休'
};

export function getLeaveBenefitSection(leaveType: string): LeaveBenefitSection | undefined {
  const title = LEAVE_TYPE_TO_BENEFIT_TITLE[leaveType] ?? leaveType;
  return leaveBenefitSections.find(section => section.title === title);
}

export interface LeaveData {
  type: string;
  displayName: string;
  totalHours: number;
  usedHours: number;
  remainingHours: number;
  leaves: LeaveRequest[];
  adjustments: LeaveAdjustment[];
}

export interface UserLeaveData {
  personalLeave: LeaveData;
  sickLeave: LeaveData;
  specialLeave: LeaveData;
  reservationLeaves: LeaveData[];
}

export async function fetchUserLeaveData(empID: string): Promise<UserLeaveData> {
  const response = await api.get(`/leave/balance/${empID}`);
  return response.data.data;
}
