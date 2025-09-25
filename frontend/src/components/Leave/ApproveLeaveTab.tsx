import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { LeaveRequest } from '../../types';
import { getAllLeaveRequests, approveLeaveRequest, rejectLeaveRequest } from '../../services/api';
import { toast } from 'react-toastify';

const ApproveLeaveTab: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('created');

  const fetchLeaveRequests = async (status?: string) => {
    try {
      setLoading(true);
      const response = await getAllLeaveRequests(status);
      setLeaveRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('無法載入請假申請');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests(statusFilter || undefined);
  }, [statusFilter]);

  const handleApprove = async (requestId: string) => {
    try {
      await approveLeaveRequest(requestId);
      toast.success('請假申請已核准');
      fetchLeaveRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error approving leave request:', error);
      const message = error.response?.data?.message || '核准失敗';
      toast.error(message);
    }
  };

  const handleRejectClick = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error('請填寫拒絕原因');
      return;
    }

    try {
      await rejectLeaveRequest(selectedRequest._id!, rejectReason);
      toast.success('請假申請已拒絕');
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason('');
      fetchLeaveRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error rejecting leave request:', error);
      const message = error.response?.data?.message || '拒絕失敗';
      toast.error(message);
    }
  };

  const handleRejectCancel = () => {
    setRejectDialogOpen(false);
    setSelectedRequest(null);
    setRejectReason('');
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'created':
        return <Chip label="待審核" color="warning" size="small" />;
      case 'approved':
        return <Chip label="已核准" color="success" size="small" />;
      case 'rejected':
        return <Chip label="已拒絕" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const handleStatusFilterChange = (_: React.MouseEvent<HTMLElement>, newValue: string | null) => {
    setStatusFilter(newValue);
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: '員工姓名',
      flex: 1,
      sortable: true
    },
    {
      field: 'department',
      headerName: '部門',
      flex: 1,
      sortable: true
    },
    {
      field: 'leaveType',
      headerName: '請假類型',
      flex: 1,
      sortable: true
    },
    {
      field: 'applicationDate',
      headerName: '申請日期',
      flex: 1,
      valueGetter: (_, row) => `${row.YY}/${row.mm}/${row.DD}`,
      sortable: true
    },
    {
      field: 'leaveStart',
      headerName: '請假開始',
      flex: 2,
      valueGetter: (_, row) => new Date(row.leaveStart).toLocaleString('zh-TW'),
      sortable: true
    },
    {
      field: 'leaveEnd',
      headerName: '請假結束',
      flex: 2,
      valueGetter: (_, row) => new Date(row.leaveEnd).toLocaleString('zh-TW'),
      sortable: true
    },
    {
      field: 'duration',
      headerName: '請假時數',
      flex: 2,
      valueGetter: (_, row) => `${row.hour}小時${row.minutes}分鐘`,
      sortable: false
    },
    {
      field: 'reason',
      headerName: '原因',
      flex: 4,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <span>
            {params.value?.length > 30
              ? `${params.value.substring(0, 30)}...`
              : params.value}
          </span>
        </Tooltip>
      ),
      sortable: false
    },
    {
      field: 'status',
      headerName: '狀態',
      flex: 1,
      renderCell: (params) => getStatusChip(params.value),
      sortable: true
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '操作',
      flex: 2,
      getActions: (params) => {
        const actions = [];

        if (params.row.status === 'created') {
        // if (1 == 1) {
          actions.push(
            <GridActionsCellItem
              icon={
                <Tooltip title="核准">
                  <ApproveIcon color="success" />
                </Tooltip>
              }
              label="核准"
              onClick={() => handleApprove(params.row._id)}
            />,
            <GridActionsCellItem
              icon={
                <Tooltip title="拒絕">
                  <RejectIcon color="error" />
                </Tooltip>
              }
              label="拒絕"
              onClick={() => handleRejectClick(params.row)}
            />
          );
        }

        return actions;
      }
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        請假審核
      </Typography>


      <Card sx={{ mb: 3 }}>
        <CardContent sx={{
          "&:last-child": {
              p: 2
          }
        }}>
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={handleStatusFilterChange}
            aria-label="狀態篩選"
            size="small"
          >
            <ToggleButton value="created" aria-label="待審核">
              待審核
            </ToggleButton>
            <ToggleButton value="approved" aria-label="已核准">
              已核准
            </ToggleButton>
            <ToggleButton value="rejected" aria-label="已拒絕">
              已拒絕
            </ToggleButton>
            <ToggleButton value="" aria-label="全部">
              全部
            </ToggleButton>
          </ToggleButtonGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={leaveRequests}
              columns={columns}
              getRowId={(row) => row._id}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 10 }
                },
                sorting: {
                  sortModel: [{ field: 'leaveStart', sort: 'desc' }]
                }
              }}
              disableRowSelectionOnClick
              localeText={{
                noRowsLabel: statusFilter
                  ? `目前沒有${statusFilter === 'created' ? '待審核' : statusFilter === 'approved' ? '已核准' : '已拒絕'}的請假申請`
                  : '沒有請假申請資料',
                toolbarDensity: '密度',
                toolbarDensityLabel: '密度',
                toolbarDensityCompact: '緊密',
                toolbarDensityStandard: '標準',
                toolbarDensityComfortable: '舒適',
                toolbarColumns: '欄位',
                toolbarColumnsLabel: '選擇欄位',
                toolbarFilters: '篩選',
                toolbarFiltersLabel: '顯示篩選器',
                toolbarFiltersTooltipHide: '隱藏篩選器',
                toolbarFiltersTooltipShow: '顯示篩選器'
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={handleRejectCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          拒絕請假申請
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                員工: {selectedRequest.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                請假類型: {selectedRequest.leaveType}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                請假時間: {new Date(selectedRequest.leaveStart).toLocaleDateString('zh-TW')}
                至 {new Date(selectedRequest.leaveEnd).toLocaleDateString('zh-TW')}
              </Typography>
            </Box>
          )}
          <TextField
            label="拒絕原因"
            multiline
            rows={4}
            fullWidth
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="請說明拒絕此請假申請的原因..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectCancel}>
            取消
          </Button>
          <Button
            onClick={handleRejectConfirm}
            variant="contained"
            color="error"
            disabled={!rejectReason.trim()}
          >
            確認拒絕
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApproveLeaveTab;