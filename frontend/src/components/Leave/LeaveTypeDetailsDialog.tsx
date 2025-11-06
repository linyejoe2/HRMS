import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip
} from '@mui/material';
import { LeaveRequest } from '../../types';

interface LeaveTypeDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  leaveType: string;
  leaves: LeaveRequest[];
}

const getLeaveRule = (leaveType: string): string => {
  switch (leaveType) {
    case "事假":
      return "勞工請假規則第7條：「勞工因有事故必須親自處理者，得請事假，一年內合計不得超過十四日。事假期間不給工資。」"
    case "普通傷病假":
      return `勞工請假規則第4條：「
勞工因普通傷害、疾病或生理原因必須治療或休養者，得在左列規定範圍內請普通傷病假：
一、未住院者，一年內合計不得超過三十日。
二、住院者，二年內合計不得超過一年。
三、未住院傷病假與住院傷病假二年內合計不得超過一年。
經醫師診斷，罹患癌症（含原位癌）採門診方式治療或懷孕期間需安胎休養者，其治療或休養期間，併入住院傷病假計算。
普通傷病假一年內未超過三十日部分，工資折半發給，其領有勞工保險普通傷病給付未達工資半數者，由雇主補足之。」`
    case "特別休假":
      return `勞動基準法第38條：「勞工在同一雇主或事業單位，繼續工作滿一定期間者，應依下列規定給予
特別休假：
一、六個月以上一年未滿者，三日。
二、一年以上二年未滿者，七日。
三、二年以上三年未滿者，十日。
四、三年以上五年未滿者，每年十四日。
五、五年以上十年未滿者，每年十五日。
六、十年以上者，每一年加給一日，加至三十日為止。」`
    default:
      return ""
  }
}

const LeaveTypeDetailsDialog: React.FC<LeaveTypeDetailsDialogProps> = ({
  open,
  onClose,
  leaveType,
  leaves
}) => {
  // Calculate total used time
  const totalUsedMinutes = leaves.reduce((total, leave) => {
    const hours = parseInt(leave.hour) || 0;
    const minutes = parseInt(leave.minutes) || 0;
    return total + (hours * 60) + minutes;
  }, 0);

  const totalHours = Math.floor(totalUsedMinutes / 60);
  const totalMinutes = totalUsedMinutes % 60;
  const totalDays = (totalUsedMinutes / (8 * 60)).toFixed(2);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '80dvh',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {leaveType} - 已核准請假紀錄
          </Typography>
          <Chip
            label={`共 ${leaves.length} 筆`}
            color="primary"
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Descrition Section */}

        <Box sx={{ mb: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="body1" gutterBottom sx={{ whiteSpace: 'pre-line' }}>
            {getLeaveRule(leaveType)}
          </Typography>
        </Box>

        {/* Summary Section */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            統計摘要 (過去一年)
          </Typography>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Typography variant="body2">
              總時數：<strong>{totalHours} 小時 {totalMinutes} 分鐘</strong>
            </Typography>
            <Typography variant="body2">
              總天數：<strong>{totalDays} 天</strong>
            </Typography>
          </Box>
        </Box>

        {/* Leave Records Table */}
        {leaves.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              過去一年無已核准的 {leaveType} 紀錄
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>編號</strong></TableCell>
                  <TableCell><strong>申請日期</strong></TableCell>
                  <TableCell><strong>請假開始</strong></TableCell>
                  <TableCell><strong>請假結束</strong></TableCell>
                  <TableCell><strong>時數</strong></TableCell>
                  <TableCell><strong>理由</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaves.map((leave) => (
                  <TableRow key={leave._id} hover>
                    <TableCell>#{leave.sequenceNumber}</TableCell>
                    <TableCell>{`${leave.YYYY}/${leave.mm}/${leave.DD}`}</TableCell>
                    <TableCell>
                      {new Date(leave.leaveStart).toLocaleString('zh-TW', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      {new Date(leave.leaveEnd).toLocaleString('zh-TW', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      {leave.hour}h {leave.minutes}m
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {leave.reason}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          關閉
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeaveTypeDetailsDialog;
