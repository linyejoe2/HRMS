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
import { toTaipeiDate } from '@/utility';
import { calculateUsedMinutes, minutesToHours } from '../../utils/leaveCalculations';

interface LeaveTypeDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  leaveType: string;
  leaves: LeaveRequest[];
  hireDate?: Date;
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
六、十年以上者，每一年加給一日，加至三十日為止。」

參考勞動基準法第 38 條第 4 項，期滿未休完之特別休假將以時薪轉換為工資發放。`
    default:
      return ""
  }
}

const LeaveTypeDetailsDialog: React.FC<LeaveTypeDetailsDialogProps> = ({
  open,
  onClose,
  leaveType,
  leaves,
  hireDate
}) => {
  // Calculate total used time using utility functions
  const totalUsedMinutes = calculateUsedMinutes(leaves);
  const totalHours = minutesToHours(totalUsedMinutes);

  // Calculate next special leave availability (only for 特別休假)
  const calculateNextSpecialLeave = (hireDate: Date): { date: string; days: number } | null => {
    const now = new Date();
    const hireDateObj = new Date(hireDate);

    // Find next anniversary
    let nextAnniversary = new Date(hireDateObj);
    nextAnniversary.setFullYear(now.getFullYear());

    // If this year's anniversary has passed, use next year's
    if (nextAnniversary <= now) {
      nextAnniversary.setFullYear(now.getFullYear() + 1);
    }

    // Calculate years of service at next anniversary
    const yearsAtNextAnniversary = nextAnniversary.getFullYear() - hireDateObj.getFullYear();

    // Calculate special leave days at next anniversary
    let daysAtNextAnniversary = 0;
    if (yearsAtNextAnniversary === 1) {
      // Check if 6 months milestone is next
      const sixMonthsDate = new Date(hireDateObj);
      sixMonthsDate.setMonth(hireDateObj.getMonth() + 6);

      if (sixMonthsDate > now) {
        return {
          date: sixMonthsDate.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }),
          days: 3
        };
      }
      daysAtNextAnniversary = 7;
    } else if (yearsAtNextAnniversary === 2) {
      daysAtNextAnniversary = 10;
    } else if (yearsAtNextAnniversary >= 3 && yearsAtNextAnniversary < 5) {
      daysAtNextAnniversary = 14;
    } else if (yearsAtNextAnniversary >= 5 && yearsAtNextAnniversary < 10) {
      daysAtNextAnniversary = 15;
    } else {
      // 10 years and above
      daysAtNextAnniversary = Math.min(16 + (yearsAtNextAnniversary - 10), 30);
    }

    return {
      date: nextAnniversary.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      days: daysAtNextAnniversary
    };
  };

  const nextSpecialLeave = leaveType === '特別休假' && hireDate ? calculateNextSpecialLeave(hireDate) : null;

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
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Typography variant="body2">
              總時數：<strong>{totalHours.toFixed(1)} 小時</strong>
            </Typography>
          </Box>

          {nextSpecialLeave && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="primary" fontWeight="bold">
                下次特休重置日期：{nextSpecialLeave.date}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                屆時將可使用 {nextSpecialLeave.days} 天特休
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {leaveType == "特別休假" ? "  到職日: " + toTaipeiDate(hireDate) : ""}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Leave Records Table */}
        {leaves.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              過去一年無已核准的{leaveType}紀錄
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
