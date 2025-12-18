import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Attachment as AttachmentIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { LeaveRequest } from '../../types';
import { getAllLeaveRequests, approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest, employeeAPI } from '../../services/api';
import { toast } from 'react-toastify';
import InputDialog from '../common/InputDialog';
import FilePreviewDialog from '../common/FilePreviewDialog';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import { fetchUserLeaveData } from '../../services/leaveService';
import { errorToString, fuzzySearchApproval } from '@/utility';
import { calcWorkingDuration } from '@/services/workingTimeCalcService';
import { Link } from 'react-router-dom';

const ApproveLeaveList: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>('created');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

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

  // Check leave balance before approval
  const checkLeaveBalance = async (request: LeaveRequest): Promise<boolean> => {
    const leaveTypesToCheck = ['事假', '普通傷病假', '特別休假'];
    if (!leaveTypesToCheck.includes(request.leaveType)) {
      return true; // Skip validation for other leave types
    }

    try {
      // Get employee hire date
      const employeeResponse = await employeeAPI.getByEmpID(request.empID);
      const employee = employeeResponse.data.data.employee;

      if (!employee?.hireDate) {
        toast.warn("請先設定員工到職日。")
        return false; // Skip validation if hire date not available
      }

      const leaveData = await fetchUserLeaveData(request.empID, employee.hireDate);
      const workingDurentObj = calcWorkingDuration(request.leaveStart, request.leaveEnd, { useStandard4HourBlocks: true });
      const requestedHours = workingDurentObj.hourFormat

      let remainingHours = 0;
      let leaveTypeName = '';

      switch (request.leaveType) {
        case '事假':
          remainingHours = leaveData.personalLeave.remainingHours;
          leaveTypeName = '事假';
          break;
        case '普通傷病假':
          remainingHours = leaveData.sickLeave.remainingHours;
          leaveTypeName = '病假';
          break;
        case '特別休假':
          remainingHours = leaveData.specialLeave.remainingHours;
          leaveTypeName = '特休';
          break;
      }

      if (requestedHours > remainingHours) {
        setWarningMessage(
          `員工「${request.name}」的${leaveTypeName}剩餘時數為 ${remainingHours.toFixed(1)} 小時，
但此次申請需要 ${requestedHours.toFixed(1)} 小時。
超出額度 ${(requestedHours - remainingHours).toFixed(1)} 小時。`
        );
        return false;
      }

      return true;
    } catch (error) {
      throw error
      console.error('Error checking leave balance:', error);
      return true; // Continue if check fails
    }
  };

  const handleApproveClick = async (request: LeaveRequest) => {
    setSelectedRequest(request);

    // Check leave balance first
    try {
      const hasSufficientBalance = await checkLeaveBalance(request);

      if (!hasSufficientBalance) {
        // Show warning dialog
        // toast.warn(<div>
        //   <Typography variant="subtitle2" >title</Typography>
        //   <Typography variant="body1" >body</Typography>
        // </div>,{
        //   autoClose: 10000
        // })
        setWarningDialogOpen(true);
        return;
      }

      // Sufficient balance, show normal approve dialog
      setApproveDialogOpen(true);
    } catch (error) {
      toast.error(errorToString(error))
    }
  };

  const handleApproveConfirm = async (_: string) => {
    if (!selectedRequest) return;

    try {
      await approveLeaveRequest(selectedRequest._id!);
      toast.success('請假申請已核准');
      fetchLeaveRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error approving leave request:', error);
      const message = error.response?.data?.message || '核准失敗';
      toast.error(message);
      throw error;
    }
  };

  const handleRejectClick = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!selectedRequest) return;

    try {
      await rejectLeaveRequest(selectedRequest._id!, reason);
      toast.success('請假申請已拒絕');
      fetchLeaveRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error rejecting leave request:', error);
      const message = error.response?.data?.message || '拒絕失敗';
      toast.error(message);
      throw error;
    }
  };

  const handleCancelClick = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!selectedRequest) return;

    try {
      await cancelLeaveRequest(selectedRequest._id!, reason);
      toast.success('請假申請已抽單');
      fetchLeaveRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error cancelling leave request:', error);
      const message = error.response?.data?.message || '抽單失敗';
      toast.error(message);
      throw error;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'created':
        return <Chip label="待審核" color="warning" size="small" />;
      case 'approved':
        return <Chip label="已核准" color="success" size="small" />;
      case 'rejected':
        return <Chip label="已拒絕" color="error" size="small" />;
      case 'cancel':
        return <Chip label="已取消" color="default" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const handleStatusFilterChange = (_: React.MouseEvent<HTMLElement>, newValue: string | null) => {
    setStatusFilter(newValue);
  };

  const filteredLeaveRequests = leaveRequests.filter(request =>
    fuzzySearchApproval(request, searchQuery)
  );

  const columns: GridColDef[] = [
    {
      field: 'sequenceNumber',
      headerName: '編號',
      flex: 1,
      valueGetter: (_, row) => `#${row.sequenceNumber || 'N/A'}`,
      sortable: true
    },
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
      valueGetter: (_, row) => `${row.YYYY}/${row.mm}/${row.DD}`,
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
      valueGetter: (_, row) => `${row.hour}小時`,
      sortable: false
    },
    {
      field: 'reason',
      headerName: '原因',
      flex: 3,
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
      field: 'supportingInfo',
      headerName: '佐證資料',
      flex: 1,
      renderCell: (params) => {
        const files = params.value as string[] | undefined;
        if (!files || files.length === 0) return '-';

        return (
          <Tooltip title="點擊查看檔案">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedFiles(files);
                setFileDialogOpen(true);
              }}
              sx={{ color: 'primary.main' }}
            >
              <Badge badgeContent={files.length} color="primary">
                <AttachmentIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        );
      },
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
          actions.push(
            <GridActionsCellItem
              icon={
                <Tooltip title="核准">
                  <ApproveIcon color="success" />
                </Tooltip>
              }
              label="核准"
              onClick={() => handleApproveClick(params.row)}
            />,
            <GridActionsCellItem
              icon={
                <Tooltip title="拒絕">
                  <RejectIcon color="error" />
                </Tooltip>
              }
              label="拒絕"
              onClick={() => handleRejectClick(params.row)}
            />,
            <GridActionsCellItem
              icon={
                <Tooltip title="抽單">
                  <DeleteIcon color="warning" />
                </Tooltip>
              }
              label="抽單"
              onClick={() => handleCancelClick(params.row)}
            />
          );
        }

        // Allow cancel from approved/rejected states
        if (params.row.status === 'approved' || params.row.status === 'rejected') {
          actions.push(
            <GridActionsCellItem
              icon={
                <Tooltip title="核准">
                  <ApproveIcon color="disabled" />
                </Tooltip>
              }
              label="核准"
            />,
            <GridActionsCellItem
              icon={
                <Tooltip title="拒絕">
                  <RejectIcon color="disabled" />
                </Tooltip>
              }
              label="拒絕"
            />,
            <GridActionsCellItem
              icon={
                <Tooltip title="抽單">
                  <DeleteIcon color="warning" />
                </Tooltip>
              }
              label="抽單"
              onClick={() => handleCancelClick(params.row)}
            />
          );
        }

        return actions;
      }
    }
  ];

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{
          "&:last-child": {
            p: 2
          }
        }}>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
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

            <TextField
              size="small"
              placeholder="搜尋編號、姓名或部門 (空格分隔多個關鍵字)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 400 }}
            />
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={filteredLeaveRequests}
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

      {/* Approve Confirmation Dialog */}
      <InputDialog
        open={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        onConfirm={handleApproveConfirm}
        title="確認核准請假申請"
        label="備註（選填）"
        placeholder="可填寫備註資訊..."
        confirmText="確認核准"
        cancelText="取消"
        confirmColor="success"
        required={false}
        detailsContent={
          selectedRequest && (
            <Box>
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
              <Typography variant="body2" color="text.secondary">
                請假時數: {selectedRequest.hour}小時
              </Typography>
            </Box>
          )
        }
      />

      {/* Reject Dialog */}
      <InputDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={handleRejectConfirm}
        title="拒絕請假申請"
        label="拒絕原因"
        placeholder="請說明拒絕此請假申請的原因..."
        confirmText="確認拒絕"
        cancelText="取消"
        confirmColor="error"
        required={true}
        detailsContent={
          selectedRequest && (
            <Box>
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
          )
        }
      />

      {/* Cancel Dialog */}
      <InputDialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelConfirm}
        title="確認抽單"
        label="抽單原因"
        placeholder="請說明抽單原因..."
        confirmText="確認抽單"
        cancelText="取消"
        confirmColor="warning"
        required={true}
        detailsContent={
          selectedRequest && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                員工: {selectedRequest.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                請假類型: {selectedRequest.leaveType}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                當前狀態: {getStatusChip(selectedRequest.status)}
              </Typography>
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                {selectedRequest.status === 'approved' && '注意：此請假已核准，抽單將撤銷核准狀態'}
                {selectedRequest.status === 'rejected' && '注意：此請假已拒絕，抽單將移除此記錄'}
              </Typography>
            </Box>
          )
        }
      />

      {/* File Preview Dialog */}
      <FilePreviewDialog
        open={fileDialogOpen}
        onClose={() => setFileDialogOpen(false)}
        files={selectedFiles}
        title="請假佐證資料"
      />

      {/* Warning Dialog for insufficient leave balance */}
      <Dialog
        open={warningDialogOpen}
        onClose={() => setWarningDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" color="error.main">
            員工剩餘時數不足
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom sx={{ whiteSpace: 'pre-line' }}> {warningMessage}</Typography>
          </Alert>

          <Typography sx={{ mt: 2 }}>
            請先到「<Link to="/employees" style={{ textDecoration: 'none', color: '#1976d2' }}>
              員工管理
            </Link>」頁面為此員工進行假別調整，<br />增加其假別額度後再核准此申請。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarningDialogOpen(false)} variant="contained">
            知道了
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApproveLeaveList;
