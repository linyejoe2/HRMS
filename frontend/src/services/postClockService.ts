import { PostClockRequest, ApproveStatus } from '../types';
import { ApprovalStage, ApprovalStageState } from '../components/common/ApprovalTimelineModal';

const toStageState = (status: ApproveStatus): ApprovalStageState =>
  status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';

// Builds the 建立 → 證明人簽核 → 主管簽核 → 人事核准 stage sequence for the shared
// ApprovalTimelineModal, from a postclock request's witness/manager/status fields.
export function getPostClockApprovalStages(request: PostClockRequest): ApprovalStage[] {
  const stages: ApprovalStage[] = [
    { label: '建立', state: 'approved' },
    { label: '證明人簽核', state: toStageState(request.witnessApproveStatus) },
    { label: '主管簽核', state: toStageState(request.managerApproveStatus) }
  ];

  switch (request.status) {
    case 'approved':
      stages.push({ label: '人事核准', state: 'approved' });
      break;
    case 'rejected':
      stages.push({ label: '人事拒絕', state: 'rejected' });
      break;
    case 'cancel':
      stages.push({ label: '已抽單', state: 'rejected' });
      break;
    default:
      stages.push({ label: '人事審核', state: 'pending' });
  }

  return stages;
}
