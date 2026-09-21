import { OfficialBusinessRequest, ApproveStatus } from '../types';
import { ApprovalStage, ApprovalStageState } from '../components/common/ApprovalTimelineModal';

const toStageState = (status: ApproveStatus): ApprovalStageState =>
  status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';

// "empID name" for display, e.g. "A540 林承慶"; falls back to just the empID if the
// name hasn't been resolved yet.
const formatWho = (empID: string | undefined, names: Record<string, string>): string | undefined =>
  empID ? [empID, names[empID]].filter(Boolean).join(' ') : undefined;

// Builds the 建立 → 主管簽核 → 人事審核 stage sequence for the shared
// ApprovalTimelineModal, from an official-business request's manager/status fields.
// `names` resolves empID -> employee name for the manager/HR actors (the applicant's
// own name is already on the request). `manager` is only set once the manager
// actually acts, so `fallbackManagerEmpID` (the applicant's assigned Employee.manager)
// is used to still show who is expected to sign while pending.
export function getOfficialBusinessApprovalStages(
  request: OfficialBusinessRequest,
  names: Record<string, string> = {},
  fallbackManagerEmpID?: string
): ApprovalStage[] {
  const stages: ApprovalStage[] = [
    { label: '建立', state: 'approved', who: formatWho(request.applicant, { [request.applicant]: request.applicantName }), at: request.createdAt },
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
