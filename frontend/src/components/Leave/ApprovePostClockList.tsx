import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  Typography
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { PostClockRequest } from '../../types';
import { getAllPostClockRequests, approvePostClockRequest, rejectPostClockRequest, cancelPostClockRequest } from '../../services/api';
import { toast } from 'react-toastify';
import ConfirmationModal from '../common/ConfirmationModal';

const ApprovePostClockList: React.FC = () => {
  const [postClockRequests, setPostClockRequests] = useState<PostClockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PostClockRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('created');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [selectedPostClockId, setSelectedPostClockId] = useState<string | null>(null);
  const [searchSequence, setSearchSequence] = useState<string>('');

  const fetchPostClockRequests = async (status?: string) => {
    try {
      setLoading(true);
      const response = await getAllPostClockRequests(status);
      setPostClockRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching postclock requests:', error);
      toast.error('無法載入補卡申請');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostClockRequests(statusFilter || undefined);
  }, [statusFilter]);

  const handleApprove = async (requestId: string) => {
    try {
      await approvePostClockRequest(requestId);
      toast.success('補卡申請已核准');
      fetchPostClockRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error approving postclock request:', error);
      const message = error.response?.data?.message || '核准失敗';
      toast.error(message);
    }
  };

  const handleRejectClick = (request: PostClockRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error('請填寫拒絕原因');
      return;
    }

    try {
      await rejectPostClockRequest(selectedRequest._id!, rejectReason);
      toast.success('補卡申請已拒絕');
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason('');
      fetchPostClockRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error rejecting postclock request:', error);
      const message = error.response?.data?.message || '拒絕失敗';
      toast.error(message);
    }
  };

  const handleRejectCancel = () => {
    setRejectDialogOpen(false);
    setSelectedRequest(null);
    setRejectReason('');
  };

  const handleCancelClick = (postClockId: string) => {
    setSelectedPostClockId(postClockId);
    setCancelConfirmOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedPostClockId) return;

    try {
      await cancelPostClockRequest(selectedPostClockId);
      toast.success('補卡申請已抽單');
      fetchPostClockRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error cancelling postclock request:', error);
      const message = error.response?.data?.message || '抽單失敗';
      toast.error(message);
    } finally {
      setSelectedPostClockId(null);
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

  const getClockTypeLabel = (clockType: string) => {
    return clockType === 'in' ? '上班' : '下班';
  };

  const handleStatusFilterChange = (_: React.MouseEvent<HTMLElement>, newValue: string | null) => {
    setStatusFilter(newValue);
  };

  const filteredPostClockRequests = postClockRequests.filter(request => {
    if (!searchSequence) return true;
    const sequenceStr = request.sequenceNumber?.toString() || '';
    return sequenceStr.includes(searchSequence);
  });

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
      field: 'date',
      headerName: '補卡日期',
      flex: 1.5,
      valueGetter: (_, row) => new Date(row.date).toLocaleDateString('zh-TW'),
      sortable: true
    },
    {
      field: 'time',
      headerName: '補卡時間',
      flex: 1.5,
      valueGetter: (_, row) => new Date(row.time).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      sortable: true
    },
    {
      field: 'clockType',
      headerName: '類型',
      flex: 1,
      valueGetter: (_, row) => getClockTypeLabel(row.clockType),
      sortable: true
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
      flex: 2,
      renderCell: (params) => (
        params.value ? (
          <Tooltip title={params.value}>
            <span>
              {params.value?.length > 20
                ? `${params.value.substring(0, 20)}...`
                : params.value}
            </span>
          </Tooltip>
        ) : ''
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
            />,
            <GridActionsCellItem
              icon={
                <Tooltip title="抽單">
                  <DeleteIcon color="warning" />
                </Tooltip>
              }
              label="抽單"
              onClick={() => handleCancelClick(params.row._id)}
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
              placeholder="搜尋申請編號..."
              value={searchSequence}
              onChange={(e) => setSearchSequence(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={filteredPostClockRequests}
              columns={columns}
              getRowId={(row) => row._id}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 10 }
                },
                sorting: {
                  sortModel: [{ field: 'date', sort: 'desc' }]
                }
              }}
              disableRowSelectionOnClick
              localeText={{
                noRowsLabel: statusFilter
                  ? `目前沒有${statusFilter === 'created' ? '待審核' : statusFilter === 'approved' ? '已核准' : '已拒絕'}的補卡申請`
                  : '沒有補卡申請資料',
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
          拒絕補卡申請
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                員工: {selectedRequest.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                補卡類型: {getClockTypeLabel(selectedRequest.clockType)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                補卡日期: {new Date(selectedRequest.date).toLocaleDateString('zh-TW')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                補卡時間: {new Date(selectedRequest.time).toLocaleTimeString('zh-TW')}
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
            placeholder="請說明拒絕此補卡申請的原因..."
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

      <ConfirmationModal
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={handleCancelConfirm}
        title="確認抽單"
        message="您確定要抽掉這個補卡申請嗎？"
        confirmText="確認抽單"
        cancelText="取消"
        confirmColor="warning"
      />
    </Box>
  );
};

export default ApprovePostClockList;
