import { PostClockRequest, ApproveStatus } from '../types';
import { ApprovalStage, ApprovalStageState } from '../components/common/ApprovalTimelineModal';

const toStageState = (status: ApproveStatus): ApprovalStageState =>
  status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';

// "empID name" for display, e.g. "A540 林承慶"; falls back to just the empID if the
// name hasn't been resolved yet.
const formatWho = (empID: string | undefined, names: Record<string, string>): string | undefined =>
  empID ? [empID, names[empID]].filter(Boolean).join(' ') : undefined;

// Builds the 建立 → 證明人簽核 → 主管簽核 → 人事核准 stage sequence for the shared
// ApprovalTimelineModal, from a postclock request's witness/manager/status fields.
// `names` resolves empID -> employee name for the witness/manager/HR actors
// (the requester's own name is already on the request). `manager` is only set once
// the manager actually acts, so `fallbackManagerEmpID` (the requester's assigned
// Employee.manager) is used to still show who is expected to sign while pending.
export function getPostClockApprovalStages(
  request: PostClockRequest,
  names: Record<string, string> = {},
  fallbackManagerEmpID?: string
): ApprovalStage[] {
  const stages: ApprovalStage[] = [
    { label: '建立', state: 'approved', who: formatWho(request.empID, { [request.empID]: request.name }), at: request.createdAt },
    { label: '證明人簽核', state: toStageState(request.witnessApproveStatus), who: formatWho(request.witness, names), at: request.witnessApproveAt },
    { label: '主管簽核', state: toStageState(request.managerApproveStatus), who: formatWho(request.manager || fallbackManagerEmpID, names), at: request.managerApproveAt }
  ];

  switch (request.status) {
    case 'approved':
      stages.push({ label: '人事核准', state: 'approved', who: formatWho(request.approvedBy, names), at: request.updatedAt });
      break;
    case 'rejected':
      stages.push({ label: '人事拒絕', state: 'rejected', who: formatWho(request.approvedBy, names), at: request.updatedAt });
      break;
    case 'cancel':
      stages.push({ label: '已抽單', state: 'rejected', who: formatWho(request.approvedBy, names), at: request.updatedAt });
      break;
    default:
      stages.push({ label: '人事審核', state: 'pending' });
  }

  return stages;
}
