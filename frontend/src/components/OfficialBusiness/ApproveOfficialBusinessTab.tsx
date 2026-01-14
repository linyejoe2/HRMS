import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Badge,
  Chip
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/Cancel';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { officialBusinessAPI } from '../../services/api';
import { OfficialBusinessRequest } from '../../types';
import { toast } from 'react-toastify';
import FilePreviewDialog from '../common/FilePreviewDialog';

const ApproveOfficialBusinessTab: React.FC = () => {
  // State
  const [requests, setRequests] = useState<OfficialBusinessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('created');
  const [searchQuery, setSearchQuery] = useState('');

  // Rejection dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<OfficialBusinessRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // File preview
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Load official business requests
  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await officialBusinessAPI.getAll(statusFilter === 'all' ? undefined : statusFilter);
      setRequests(response.data.data || []);
    } catch (error: any) {
      console.error('Error loading official business requests:', error);
      toast.error(error.response?.data?.message || '載入外出申請失敗');
    } finally {
      setLoading(false);
    }
  };

  // Load on mount and when status filter changes
  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  // Handle status filter change
  const handleStatusFilterChange = (_: React.MouseEvent<HTMLElement>, newStatus: string | null) => {
    if (newStatus !== null) {
      setStatusFilter(newStatus);
    }
  };

  // Handle approve
  const handleApprove = async (id: string) => {
    if (!window.confirm('確定要核准此外出申請嗎？')) {
      return;
    }

    try {
      await officialBusinessAPI.approve(id);
      toast.success('外出申請已核准');
      loadRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.response?.data?.message || '核准外出申請失敗');
    }
  };

  // Handle reject
  const handleRejectClick = (request: OfficialBusinessRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest) return;

    if (!rejectionReason.trim()) {
      toast.error('請輸入拒絕理由');
      return;
    }

    try {
      await officialBusinessAPI.reject(selectedRequest._id!, rejectionReason);
      toast.success('外出申請已拒絕');
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      loadRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error(error.response?.data?.message || '拒絕外出申請失敗');
    }
  };

  // Handle cancel/withdraw
  const handleCancel = async (id: string) => {
    if (!window.confirm('確定要抽回此外出申請嗎？')) {
      return;
    }

    try {
      await officialBusinessAPI.cancel(id);
      toast.success('外出申請已抽回');
      loadRequests();
    } catch (error: any) {
      console.error('Error canceling request:', error);
      toast.error(error.response?.data?.message || '抽回外出申請失敗');
    }
  };

  // Handle view files
  const handleViewFiles = (files: string[]) => {
    setSelectedFiles(files);
    setFilePreviewOpen(true);
  };

  // Get status chip
  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'error' | 'warning' }> = {
      created: { label: '待審核', color: 'warning' },
      approved: { label: '已核准', color: 'success' },
      rejected: { label: '已拒絕', color: 'error' },
      cancel: { label: '已取消', color: 'default' }
    };

    const config = statusConfig[status] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  // Filter and search
  const filteredRequests = requests.filter((request) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const searchFields = [
      request.sequenceNumber.toString(),
      request.applicantName,
      request.participantNames.join(' '),
      request.licensePlate,
      request.purpose
    ];

    return searchFields.some(field => field.toLowerCase().includes(query));
  });

  // Define columns
  const columns: GridColDef[] = [
    {
      field: 'sequenceNumber',
      headerName: '編號',
      valueGetter: (_, row) => `#${row.sequenceNumber || 'N/A'}`,
      flex: 0.8,
      minWidth: 80
    },
    {
      field: 'applicantName',
      headerName: '申請人',
      flex: 1,
      minWidth: 100
    },
    {
      field: 'participantNames',
      headerName: '參與人員',
      flex: 2,
      minWidth: 200,
      valueGetter: (_, row) => row.participantNames?.join(', ') || '-'
    },
    {
      field: 'licensePlate',
      headerName: '車牌',
      flex: 0.8,
      minWidth: 100
    },
    {
      field: 'startTime',
      headerName: '外出時間',
      flex: 1.5,
      minWidth: 160,
      sortable: true,
      valueGetter: (_, row) => new Date(row.startTime).toLocaleString('zh-TW')
    },
    {
      field: 'endTime',
      headerName: '返回時間',
      flex: 1.5,
      minWidth: 160,
      sortable: true,
      valueGetter: (_, row) => new Date(row.endTime).toLocaleString('zh-TW')
    },
    {
      field: 'purpose',
      headerName: '事由',
      flex: 2,
      minWidth: 200,
      renderCell: (params) => {
        const text = params.value || '';
        if (text.length <= 30) return text;

        return (
          <Tooltip title={text}>
            <span>{text.substring(0, 30)}...</span>
          </Tooltip>
        );
      }
    },
    {
      field: 'supportingInfo',
      headerName: '佐證',
      flex: 0.6,
      minWidth: 60,
      align: 'center',
      renderCell: (params) => {
        const files = params.value as string[] | undefined;
        if (!files || files.length === 0) return '-';

        return (
          <Tooltip title="檢視附件">
            <IconButton
              size="small"
              onClick={() => handleViewFiles(files)}
            >
              <Badge badgeContent={files.length} color="primary">
                <AttachFileIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
        );
      }
    },
    {
      field: 'status',
      headerName: '狀態',
      flex: 1,
      minWidth: 100,
      renderCell: (params) => getStatusChip(params.value)
    },
    {
      field: 'rejectionReason',
      headerName: '說明',
      flex: 1.5,
      minWidth: 150,
      valueGetter: (_, row) => row.rejectionReason || '-'
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '操作',
      flex: 1.2,
      minWidth: 120,
      getActions: (params) => {
        const actions = [];

        if (params.row.status === 'created') {
          // Approve
          actions.push(
            <GridActionsCellItem
              icon={
                <Tooltip title="核准">
                  <CheckIcon />
                </Tooltip>
              }
              label="核准"
              onClick={() => handleApprove(params.row._id)}
              showInMenu={false}
            />
          );

          // Reject
          actions.push(
            <GridActionsCellItem
              icon={
                <Tooltip title="拒絕">
                  <CloseIcon />
                </Tooltip>
              }
              label="拒絕"
              onClick={() => handleRejectClick(params.row)}
              showInMenu={false}
            />
          );
        }

        // Withdraw (for any status except cancel)
        if (params.row.status !== 'cancel') {
          actions.push(
            <GridActionsCellItem
              icon={
                <Tooltip title="抽單">
                  <CancelIcon />
                </Tooltip>
              }
              label="抽單"
              onClick={() => handleCancel(params.row._id)}
              showInMenu={false}
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
        外出審核
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Status Filter */}
            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={handleStatusFilterChange}
              size="small"
            >
              <ToggleButton value="created">待審核</ToggleButton>
              <ToggleButton value="approved">已核准</ToggleButton>
              <ToggleButton value="rejected">已拒絕</ToggleButton>
              <ToggleButton value="all">全部</ToggleButton>
            </ToggleButtonGroup>

            {/* Search */}
            <TextField
              placeholder="搜尋編號、申請人、參與人員、車牌、事由"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
              共 {filteredRequests.length} 筆
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" sx={{ mb: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Data Grid */}
      <Card>
        <CardContent>
          <Box sx={{ width: '100%', height: 600 }}>
            <DataGrid
              rows={filteredRequests.map((request) => ({
                id: request._id,
                ...request
              }))}
              columns={columns}
              loading={loading}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 25 }
                },
                sorting: {
                  sortModel: [{ field: 'startTime', sort: 'desc' }]
                }
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell': {
                  borderRight: 1,
                  borderColor: 'divider',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'action.hover',
                  borderBottom: 2,
                  borderColor: 'divider',
                }
              }}
              localeText={{
                noRowsLabel: '尚無外出申請記錄'
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>拒絕外出申請</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            申請人：{selectedRequest?.applicantName} ({selectedRequest?.applicant})
          </Typography>
          <TextField
            label="拒絕理由"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            multiline
            rows={4}
            fullWidth
            required
            autoFocus
            placeholder="請輸入拒絕此申請的理由"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleRejectConfirm}
            variant="contained"
            color="error"
            disabled={!rejectionReason.trim()}
          >
            確認拒絕
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Preview Dialog */}
      <FilePreviewDialog
        open={filePreviewOpen}
        onClose={() => setFilePreviewOpen(false)}
        files={selectedFiles}
      />
    </Box>
  );
};

export default ApproveOfficialBusinessTab;
