import React, { useEffect, useState } from 'react';
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
import { toTaipeiDate } from '@/utility';
import { calculateNextSpecialLeave, formatMinutesToHours } from '../../utils/leaveCalculations';
import { LeaveData } from '../../services/leaveService';
import { employeeAPI } from '@/services/api';
import { toast } from 'react-toastify';

interface LeaveTypeDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  leaveData: LeaveData;
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
      return `勞動基準法第38條：「
勞工在同一雇主或事業單位，繼續工作滿一定期間者，應依下列規定給予特別休假：
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
  leaveData,
  hireDate
}) => {
  const [employeeMap, setEmployeeMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Use pre-calculated values from leaveData
  const { type: leaveType, totalHours, usedHours, remainingHours, leaves, adjustments } = leaveData;

  // Calculate total adjustment hours for display
  const totalAdjustmentHours = adjustments.reduce((total, adj) => {
    return total + (adj.minutes / 60);
  }, 0);

  // ✅ 頁面載入時，一次抓所有 employee
  useEffect(() => {
    async function fetchEmployees() {
      try {
        const allEmployees = (await employeeAPI.getAll()).data.data.employees;
        // 假設回傳格式是 [{ id: 'E001', name: '王小明' }, ...]
        const map: Record<string, string> = {};
        allEmployees.forEach((emp) => {
          map[emp.empID] = emp.name;
        });
        setEmployeeMap(map);
      } catch (error) {
        console.error("取得員工資料失敗:", error);
        toast.error("無法載入員工資料");
      } finally {
        setLoading(false);
      }
    }

    fetchEmployees();
  }, []);

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
            {leaveType} - 請假紀錄
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
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          統計摘要
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' }, // 手機直排、桌機橫排
            gap: 2, // Box 之間的間距
            mb: 3
          }}
        >
          {/* 第一個 Box */}
          <Box
            sx={{
              flex: 1, // 讓兩個 Box 平均分配寬度
              mb: { xs: 2, md: 0 },
              p: 2,
              backgroundColor: 'action.hover',
              borderRadius: 1,
            }}
          >
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">總額度:</Typography>
              <Typography variant="body2">{Math.round(totalHours)} 小時</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">已使用:</Typography>
              <Typography variant="body2">{Math.round(usedHours)} 小時</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">手動調整:</Typography>
              <Typography variant="body2">{Math.round(totalAdjustmentHours)} 小時</Typography>
            </Box>
            <Box
              display="flex"
              justifyContent="space-between"
              sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}
            >
              <Typography variant="body1" fontWeight="bold">
                剩餘可用:
              </Typography>
              <Typography
                variant="body1"
                fontWeight="bold"
                color={remainingHours < 0 ? 'error.main' : 'primary.main'}
              >
                {Math.round(remainingHours)} 小時
              </Typography>
            </Box>
          </Box>

          {/* 第二個 Box */}
          {nextSpecialLeave && (
            <Box
              sx={{
                flex: 1,
                p: 2,
                backgroundColor: 'action.hover',
                borderRadius: 1,
              }}
            >
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">到職日:</Typography>
                  <Typography variant="body2">{toTaipeiDate(hireDate)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" >下次特休重置日期：</Typography>
                  <Typography variant="body2" >{nextSpecialLeave.date}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1} sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="body1" fontWeight="bold">屆時特休天數</Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary"><span style={{ fontWeight: 'bold' }}>{nextSpecialLeave.days}</span> 天</Typography>
                </Box>
                {/* <Typography variant="body2" fontWeight="bold">
                  {leaveType == '特別休假' ? '到職日: ' + toTaipeiDate(hireDate) : ''}
                </Typography>
                <Typography variant="body2" color="primary" fontWeight="bold">
                  下次特休重置日期：{nextSpecialLeave.date}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  屆時將可使用 <span style={{ fontWeight: 'bold' }}>{nextSpecialLeave.days}</span> 天特休
                </Typography> */}
              </Box>
            </Box>
          )}
        </Box>


        {/* Leave Records Table */}
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          請假記錄
        </Typography>
        {leaves.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, mb: 3 }}>
            <Typography color="text.secondary">
              過去一年無已核准的{leaveType}紀錄
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ mb: 3 }} component={Paper} variant="outlined">
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
                      {leave.hour} 小時
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

        {/* Adjustments Section */}
        {adjustments.length > 0 && (
          <>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              調整記錄
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>調整時間</TableCell>
                    <TableCell>調整時數</TableCell>
                    <TableCell>原因</TableCell>
                    <TableCell>調整者</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adjustments.map((adj) => (
                    <TableRow key={adj._id}>
                      <TableCell>
                        {new Date(adj.createdAt || '').toLocaleString('zh-TW')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${adj.minutes > 0 ? '+' : ''}${formatMinutesToHours(adj.minutes)} 小時`}
                          color={adj.minutes > 0 ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{adj.reason}</TableCell>
                      <TableCell>{employeeMap[adj.createdBy] || "未知使用者"}</TableCell>
                      {/* <TableCell>{adj.createdBy}</TableCell> */}
                      {/* <TableCell>{generateCreatedByName(adj.createdBy)}</TableCell> */}
                    </TableRow>
                  ))}
                  {leaves.length > 0 && (
                    <TableRow>
                      <TableCell >
                        <strong>小計:</strong>
                      </TableCell>
                      <TableCell >
                        <strong>{Math.round(totalAdjustmentHours)} 小時</strong>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          關閉
        </Button>
      </DialogActions>
    </Dialog >
  );
};

export default LeaveTypeDetailsDialog;
