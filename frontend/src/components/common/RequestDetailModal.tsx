import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Grid, Box, Chip } from '@mui/material';
import { Attachment as AttachmentIcon } from '@mui/icons-material';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import {
  ApproveStatus,
  BusinessTripRequest,
  LeaveRequest,
  OfficialBusinessRequest,
  PendingManagerItem,
  PendingManagerRequestType,
  PostClockRequest
} from '../../types';
import { getDepartmentDescription } from '@/services/variableService';
import { leaveDisplaynameConverter } from '@/services/leaveService';
import { toTaipeiString } from '@/utils/util/utility';
import { getRequesterEmpID, getRequesterName } from '@/services/pendingManagerService';
import { employeeAPI } from '@/services/api';
import FilePreviewDialog from './FilePreviewDialog';

interface RequestDetailModalProps {
  open: boolean;
  onClose: () => void;
  item: PendingManagerItem | null;
}

const REQUEST_TYPE_LABELS: Record<PendingManagerRequestType, string> = {
  leave: '請假',
  businessTrip: '因公免刷卡',
  postClock: '補單',
  officialBusiness: '外出'
};

// const OVERALL_STATUS_LABELS: Record<string, string> = {
//   created: '審核中',
//   approved: '已核准',
//   rejected: '已拒絕',
//   cancel: '已取消'
// };

const STAGE_STATUS_LABELS: Record<ApproveStatus, string> = {
  pending: '審核中',
  approved: '已核准',
  rejected: '已拒絕'
};

// Only formats a date when one was actually recorded — toTaipeiString(undefined)
// falls back to "now", which would be misleading for a stage that hasn't happened yet.
const formatDate = (date?: string): string => (date ? toTaipeiString(date) : '-');

const DetailField: React.FC<{ label: string; value?: React.ReactNode; sm?: number }> = ({ label, value, sm = 6 }) => (
  <Grid item xs={12} sm={sm}>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography variant="body1" sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
      {value === undefined || value === null || value === '' ? '-' : value}
    </Typography>
  </Grid>
);

const RequestDetailModal: React.FC<RequestDetailModalProps> = ({ open, onClose, item }) => {
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});

  // Resolve the substitute/witness empID into a display name (leave/postClock only —
  // the requester's own name already comes from the saved record's name/applicantName field).
  useEffect(() => {
    if (!item) return;

    const empID =
      item.requestType === 'leave'
        ? (item.data as LeaveRequest).substitute
        : item.requestType === 'postClock'
          ? (item.data as PostClockRequest).witness
          : undefined;

    if (!empID || empID in resolvedNames) return;

    let active = true;
    employeeAPI.getNameById(empID)
      .then(name => {
        if (active) setResolvedNames(prev => ({ ...prev, [empID]: name }));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  if (!item) return null;

  const { requestType, data } = item;
  const requesterName = getRequesterName(item);
  const requesterEmpID = getRequesterEmpID(item);
  const attachments = data.supportingInfo || [];

  const renderTypeFields = () => {
    switch (requestType) {
      case 'leave': {
        const d = data as LeaveRequest;
        return (
          <>
            <DetailField label="請假類型" value={leaveDisplaynameConverter(d.leaveType)} />
            <DetailField label="代理人" value={resolvedNames[d.substitute] ?? d.substitute} />
            <DetailField label="請假期間" value={`${toTaipeiString(d.leaveStart)} 至 ${toTaipeiString(d.leaveEnd)}`} sm={12} />
            <DetailField label="請假原因" value={d.reason} sm={12} />
            <DetailField label="代理人簽核狀態" value={STAGE_STATUS_LABELS[d.substituteApproveStatus]} />
            <DetailField label="代理人簽核時間" value={formatDate(d.substituteApproveAt)} />
            {d.substituteMemo && <DetailField label="代理人備註" value={d.substituteMemo} sm={12} />}
          </>
        );
      }
      case 'businessTrip': {
        const d = data as BusinessTripRequest;
        return (
          <>
            <DetailField label="目的地" value={d.destination} />
            <DetailField label="洽辦對象" value={d.contactPerson} />
            <DetailField label="出發時間" value={toTaipeiString(d.tripStart)} />
            <DetailField label="返回時間" value={toTaipeiString(d.tripEnd)} />
            <DetailField label="交通方式" value={d.transportation} />
            <DetailField label="預估費用" value={d.estimatedCost ? `NT$ ${d.estimatedCost.toLocaleString()}` : undefined} />
            <DetailField label="因公免刷卡目的" value={d.purpose} sm={12} />
            {d.clockTimes && d.clockTimes.length > 0 && (
              <DetailField
                label="每日上下班時間"
                sm={12}
                value={d.clockTimes
                  .map((c, i) => `第 ${i + 1} 天：${toTaipeiString(c.clockIn)} - ${toTaipeiString(c.clockOut)}`)
                  .join('\n')}
              />
            )}
            {d.notes && <DetailField label="備註" value={d.notes} sm={12} />}
          </>
        );
      }
      case 'postClock': {
        const d = data as PostClockRequest;
        const timeDetail =
          d.clockType === 'in'
            ? `上班：${toTaipeiString(d.time)}`
            : d.clockType === 'out'
              ? `下班：${toTaipeiString(d.time)}`
              : `上班：${toTaipeiString(d.time)}\n下班：${toTaipeiString(d.time2)}`;
        return (
          <>
            <DetailField label="補單日期" value={d.date} />
            <DetailField
              label="打卡類型"
              value={d.clockType === 'in' ? '上班' : d.clockType === 'out' ? '下班' : '上下班'}
            />
            <DetailField label="時間" value={timeDetail} sm={12} />
            <DetailField label="補單原因" value={d.reason} sm={12} />
            <DetailField label="證明人" value={resolvedNames[d.witness] ?? d.witness} />
            <DetailField label="證明人簽核狀態" value={STAGE_STATUS_LABELS[d.witnessApproveStatus]} />
            <DetailField label="證明人簽核時間" value={formatDate(d.witnessApproveAt)} />
            {d.witnessMemo && <DetailField label="證明人備註" value={d.witnessMemo} sm={12} />}
          </>
        );
      }
      case 'officialBusiness': {
        const d = data as OfficialBusinessRequest;
        return (
          <>
            <DetailField label="同行人員" value={d.participantNames?.join('、')} sm={12} />
            <DetailField label="車牌號碼" value={d.licensePlate} />
            <DetailField label="外出時間" value={toTaipeiString(d.startTime)} />
            <DetailField label="返回時間" value={d.endTime ? toTaipeiString(d.endTime) : '尚未填寫'} />
            <DetailField label="外出事由" value={d.purpose} sm={12} />
          </>
        );
      }
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              {REQUEST_TYPE_LABELS[requestType]}申請詳細資料
            </Typography>
            <Chip label={`#${data.sequenceNumber ?? 'N/A'}`} size="small" />
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={2}>
            <DetailField label="申請人" value={`${requesterName}（${requesterEmpID}）`} />
            <DetailField label="部門" value={getDepartmentDescription(data.department)} />

            {renderTypeFields()}

            <Grid item xs={12}>
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2, mt: 1 }}>
                <Grid container spacing={2}>
                  {/* <DetailField label="狀態" value={OVERALL_STATUS_LABELS[data.status] ?? data.status} />
                  <DetailField
                    label="主管簽核狀態"
                    value={data.managerApproveStatus ? STAGE_STATUS_LABELS[data.managerApproveStatus] : undefined}
                  />
                  <DetailField label="主管簽核時間" value={formatDate(data.managerApproveAt)} />
                  {data.managerMemo && <DetailField label="主管備註" value={data.managerMemo} sm={12} />}
                  {data.rejectionReason && <DetailField label="說明/拒絕原因" value={data.rejectionReason} sm={12} />} */}
                  {data.agent && <DetailField label="代辦人" value={data.agent} />}
                  {/* {data.approvedBy && <DetailField label="人事處理人" value={data.approvedBy} />} */}
                  <DetailField label="建立時間" value={formatDate(data.createdAt)} />
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      附件
                    </Typography>
                    {attachments.length === 0 ? (
                      <Typography variant="body1">-</Typography>
                    ) : (
                      <IconButton size="small" onClick={() => setFileDialogOpen(true)} sx={{ color: 'primary.main', ml: -1 }}>
                        <Badge badgeContent={attachments.length} color="primary">
                          <AttachmentIcon />
                        </Badge>
                      </IconButton>
                    )}
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} variant="contained">
            關閉
          </Button>
        </DialogActions>
      </Dialog>

      <FilePreviewDialog
        open={fileDialogOpen}
        onClose={() => setFileDialogOpen(false)}
        files={attachments}
        title="附件資料"
      />
    </>
  );
};

export default RequestDetailModal;
