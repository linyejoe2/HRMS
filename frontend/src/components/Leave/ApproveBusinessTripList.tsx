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
import { BusinessTripRequest } from '../../types';
import { getAllBusinessTripRequests, approveBusinessTripRequest, rejectBusinessTripRequest, cancelBusinessTripRequest } from '../../services/api';
import { toast } from 'react-toastify';
import ConfirmationModal from '../common/ConfirmationModal';

const ApproveBusinessTripList: React.FC = () => {
  const [businessTripRequests, setBusinessTripRequests] = useState<BusinessTripRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BusinessTripRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('created');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [searchSequence, setSearchSequence] = useState<string>('');

  const fetchBusinessTripRequests = async (status?: string) => {
    try {
      setLoading(true);
      const response = await getAllBusinessTripRequests(status);
      setBusinessTripRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching business trip requests:', error);
      toast.error('無法載入出差申請');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessTripRequests(statusFilter || undefined);
  }, [statusFilter]);

  const handleApprove = async (requestId: string) => {
    try {
      await approveBusinessTripRequest(requestId);
      toast.success('出差申請已核准');
      fetchBusinessTripRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error approving business trip request:', error);
      const message = error.response?.data?.message || '核准失敗';
      toast.error(message);
    }
  };

  const handleRejectClick = (request: BusinessTripRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error('請填寫拒絕原因');
      return;
    }

    try {
      await rejectBusinessTripRequest(selectedRequest._id!, rejectReason);
      toast.success('出差申請已拒絕');
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason('');
      fetchBusinessTripRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error rejecting business trip request:', error);
      const message = error.response?.data?.message || '拒絕失敗';
      toast.error(message);
    }
  };

  const handleRejectCancel = () => {
    setRejectDialogOpen(false);
    setSelectedRequest(null);
    setRejectReason('');
  };

  const handleCancelClick = (tripId: string) => {
    setSelectedTripId(tripId);
    setCancelConfirmOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedTripId) return;

    try {
      await cancelBusinessTripRequest(selectedTripId);
      toast.success('出差申請已抽單');
      fetchBusinessTripRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error cancelling business trip request:', error);
      const message = error.response?.data?.message || '抽單失敗';
      toast.error(message);
    } finally {
      setSelectedTripId(null);
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

  const filteredBusinessTripRequests = businessTripRequests.filter(request => {
    if (!searchSequence) return true;
    const sequenceStr = request.sequenceNumber?.toString() || '';
    return sequenceStr.includes(searchSequence);
  });

  const columns: GridColDef[] = [
    {
      field: 'sequenceNumber',
      headerName: '編號',
      flex: 0.8,
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
      field: 'destination',
      headerName: '目的地',
      flex: 1,
      sortable: true
    },
    {
      field: 'tripStart',
      headerName: '出發時間',
      flex: 1.5,
      valueGetter: (_, row) => new Date(row.tripStart).toLocaleString('zh-TW'),
      sortable: true
    },
    {
      field: 'tripEnd',
      headerName: '返回時間',
      flex: 1.5,
      valueGetter: (_, row) => new Date(row.tripEnd).toLocaleString('zh-TW'),
      sortable: true
    },
    {
      field: 'purpose',
      headerName: '目的',
      flex: 2,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <span>
            {params.value?.length > 25
              ? `${params.value.substring(0, 25)}...`
              : params.value}
          </span>
        </Tooltip>
      ),
      sortable: false
    },
    {
      field: 'transportation',
      headerName: '交通',
      flex: 0.8,
      sortable: true
    },
    // {
    //   field: 'estimatedCost',
    //   headerName: '預估費用',
    //   flex: 1,
    //   valueGetter: (_, row) => row.estimatedCost ? `NT$ ${row.estimatedCost.toLocaleString()}` : '-',
    //   sortable: true
    // },
    {
      field: 'status',
      headerName: '狀態',
      flex: 0.8,
      renderCell: (params) => getStatusChip(params.value),
      sortable: true
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '操作',
      flex: 1.5,
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
              rows={filteredBusinessTripRequests}
              columns={columns}
              getRowId={(row) => row._id}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 10 }
                },
                sorting: {
                  sortModel: [{ field: 'tripStart', sort: 'desc' }]
                }
              }}
              disableRowSelectionOnClick
              localeText={{
                noRowsLabel: statusFilter
                  ? `目前沒有${statusFilter === 'created' ? '待審核' : statusFilter === 'approved' ? '已核准' : '已拒絕'}的出差申請`
                  : '沒有出差申請資料',
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
          拒絕出差申請
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                員工: {selectedRequest.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                目的地: {selectedRequest.destination}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                出發時間: {new Date(selectedRequest.tripStart).toLocaleString('zh-TW')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                返回時間: {new Date(selectedRequest.tripEnd).toLocaleString('zh-TW')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                目的: {selectedRequest.purpose}
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
            placeholder="請說明拒絕此出差申請的原因..."
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
        message="您確定要抽掉這個出差申請嗎？"
        confirmText="確認抽單"
        cancelText="取消"
        confirmColor="warning"
      />
    </Box>
  );
};

export default ApproveBusinessTripList;
