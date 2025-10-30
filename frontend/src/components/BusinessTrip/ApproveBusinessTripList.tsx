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
  TextField
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Attachment as AttachmentIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { BusinessTripRequest } from '../../types';
import { getAllBusinessTripRequests, approveBusinessTripRequest, rejectBusinessTripRequest, cancelBusinessTripRequest } from '../../services/api';
import { toast } from 'react-toastify';
import InputDialog from '../common/InputDialog';
import FilePreviewDialog from '../common/FilePreviewDialog';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';

const ApproveBusinessTripList: React.FC = () => {
  const [businessTripRequests, setBusinessTripRequests] = useState<BusinessTripRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BusinessTripRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>('created');
  const [searchSequence, setSearchSequence] = useState<string>('');
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

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

  const handleApproveClick = (request: BusinessTripRequest) => {
    setSelectedRequest(request);
    setApproveDialogOpen(true);
  };

  const handleApproveConfirm = async (_: string) => {
    if (!selectedRequest) return;

    try {
      await approveBusinessTripRequest(selectedRequest._id!);
      toast.success('出差申請已核准');
      fetchBusinessTripRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error approving business trip request:', error);
      const message = error.response?.data?.message || '核准失敗';
      toast.error(message);
      throw error;
    }
  };

  const handleRejectClick = (request: BusinessTripRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!selectedRequest) return;

    try {
      await rejectBusinessTripRequest(selectedRequest._id!, reason);
      toast.success('出差申請已拒絕');
      fetchBusinessTripRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error rejecting business trip request:', error);
      const message = error.response?.data?.message || '拒絕失敗';
      toast.error(message);
      throw error;
    }
  };

  const handleCancelClick = (request: BusinessTripRequest) => {
    setSelectedRequest(request);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!selectedRequest) return;

    try {
      await cancelBusinessTripRequest(selectedRequest._id!, reason);
      toast.success('出差申請已抽單');
      fetchBusinessTripRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error cancelling business trip request:', error);
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
      field: 'supportingInfo',
      headerName: '相關資料',
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

      {/* Approve Confirmation Dialog */}
      <InputDialog
        open={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        onConfirm={handleApproveConfirm}
        title="確認核准出差申請"
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
          )
        }
      />

      {/* Reject Dialog */}
      <InputDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={handleRejectConfirm}
        title="拒絕出差申請"
        label="拒絕原因"
        placeholder="請說明拒絕此出差申請的原因..."
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
                目的地: {selectedRequest.destination}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                出發時間: {new Date(selectedRequest.tripStart).toLocaleString('zh-TW')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                返回時間: {new Date(selectedRequest.tripEnd).toLocaleString('zh-TW')}
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
                目的地: {selectedRequest.destination}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                當前狀態: {getStatusChip(selectedRequest.status)}
              </Typography>
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                {selectedRequest.status === 'approved' && '注意：此出差已核准，抽單將撤銷核准狀態'}
                {selectedRequest.status === 'rejected' && '注意：此出差已拒絕，抽單將移除此記錄'}
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
        title="出差相關資料"
      />
    </Box>
  );
};

export default ApproveBusinessTripList;
