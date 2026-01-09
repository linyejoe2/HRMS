import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  Badge,
  Chip
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { officialBusinessAPI } from '../../services/api';
import { OfficialBusinessRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import OfficialBusinessRequestModal from './OfficialBusinessRequestModal';
import FilePreviewDialog from '../common/FilePreviewDialog';

const OfficialBusinessTab: React.FC = () => {
  const { user } = useAuth();

  // State
  const [requests, setRequests] = useState<OfficialBusinessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Load official business requests
  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await officialBusinessAPI.getMy();
      setRequests(response.data.data || []);
    } catch (error: any) {
      console.error('Error loading official business requests:', error);
      toast.error(error.response?.data?.message || '載入外出申請失敗');
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadRequests();
  }, []);

  // Handle cancel request
  const handleCancelRequest = async (id: string, applicant: string) => {
    // Only applicant can cancel their own request
    if (applicant !== user?.empID) {
      toast.error('只有申請人可以取消此申請');
      return;
    }

    if (!window.confirm('確定要取消此外出申請嗎？')) {
      return;
    }

    try {
      await officialBusinessAPI.cancel(id);
      toast.success('外出申請已取消');
      loadRequests();
    } catch (error: any) {
      console.error('Error canceling request:', error);
      toast.error(error.response?.data?.message || '取消外出申請失敗');
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

  // Define columns
  const columns: GridColDef[] = [
    {
      field: 'sequenceNumber',
      headerName: '#編號',
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
      headerName: '車牌號碼',
      flex: 1,
      minWidth: 100
    },
    {
      field: 'startTime',
      headerName: '外出時間',
      flex: 1.5,
      minWidth: 160,
      valueGetter: (_, row) => new Date(row.startTime).toLocaleString('zh-TW')
    },
    {
      field: 'endTime',
      headerName: '返回時間',
      flex: 1.5,
      minWidth: 160,
      valueGetter: (_, row) => new Date(row.endTime).toLocaleString('zh-TW')
    },
    {
      field: 'purpose',
      headerName: '外出事由',
      flex: 2,
      minWidth: 200
    },
    {
      field: 'supportingInfo',
      headerName: '佐證資料',
      flex: 0.8,
      minWidth: 80,
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
                <AttachFileIcon />
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
      flex: 0.8,
      minWidth: 80,
      getActions: (params) => {
        const actions = [];

        // Only show cancel for 'created' status and if user is the applicant
        if (params.row.status === 'created' && params.row.applicant === user?.empID) {
          actions.push(
            <GridActionsCellItem
              icon={
                <Tooltip title="取消申請">
                  <CancelIcon />
                </Tooltip>
              }
              label="取消"
              onClick={() => handleCancelRequest(params.row._id, params.row.applicant)}
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
        外出申請
      </Typography>

      {/* Header Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              共 {requests.length} 筆外出申請
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setModalOpen(true)}
            >
              新增外出申請
            </Button>
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
              rows={requests.map((request) => ({
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

      {/* Request Modal */}
      <OfficialBusinessRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadRequests}
      />

      {/* File Preview Dialog */}
      <FilePreviewDialog
        open={filePreviewOpen}
        onClose={() => setFilePreviewOpen(false)}
        files={selectedFiles}
      />
    </Box>
  );
};

export default OfficialBusinessTab;
