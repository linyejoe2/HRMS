import {
  BusinessTripRequest,
  LeaveRequest,
  OfficialBusinessRequest,
  PendingManagerItem,
  PostClockRequest
} from '../types';
import { leaveDisplaynameConverter } from '@/services/leaveService';
import { toTaipeiString } from '@/utils/util/utility';

// officialBusiness names its requester/applicant fields differently (applicant/applicantName)
// than the other 3 request types (empID/name), so every consumer needs this same branch.
export const getRequesterEmpID = (item: PendingManagerItem): string =>
  item.requestType === 'officialBusiness'
    ? (item.data as OfficialBusinessRequest).applicant
    : (item.data as LeaveRequest | BusinessTripRequest | PostClockRequest).empID;

export const getRequesterName = (item: PendingManagerItem): string =>
  item.requestType === 'officialBusiness'
    ? (item.data as OfficialBusinessRequest).applicantName
    : (item.data as LeaveRequest | BusinessTripRequest | PostClockRequest).name;

export const getReason = (item: PendingManagerItem): string => {
  switch (item.requestType) {
    case 'leave':
      return (item.data as LeaveRequest).reason;
    case 'postClock':
      return (item.data as PostClockRequest).reason;
    case 'businessTrip':
      return (item.data as BusinessTripRequest).purpose;
    case 'officialBusiness':
      return (item.data as OfficialBusinessRequest).purpose;
    default:
      return '';
  }
};

export const getDetail = (item: PendingManagerItem): string => {
  switch (item.requestType) {
    case 'leave': {
      const data = item.data as LeaveRequest;
      return `${leaveDisplaynameConverter(data.leaveType)}：${toTaipeiString(data.leaveStart)} 至 ${toTaipeiString(data.leaveEnd)}`;
    }
    case 'businessTrip': {
      const data = item.data as BusinessTripRequest;
      return `${data.destination}：${toTaipeiString(data.tripStart)} 至 ${toTaipeiString(data.tripEnd)}`;
    }
    case 'postClock': {
      const data = item.data as PostClockRequest;
      if (data.clockType == "in") {
        return `上班：${toTaipeiString(data.time)}`;
      } else if (data.clockType == 'out') {
        return `下班：${toTaipeiString(data.time)}`;
      } else {
        return `上班：${toTaipeiString(data.time)}
        下班：${toTaipeiString(data.time2)}`;
      }
    }
    case 'officialBusiness': {
      const data = item.data as OfficialBusinessRequest;
      return `外出：${toTaipeiString(data.startTime)}${data.endTime ? ` 至 ${toTaipeiString(data.endTime)}` : ''}`;
    }
    default:
      return '';
  }
};
