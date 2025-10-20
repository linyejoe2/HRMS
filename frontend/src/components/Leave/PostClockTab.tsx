import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { PostClockRequest } from '../../types';
import { getMyPostClockRequests, cancelPostClockRequest } from '../../services/api';
import { toast } from 'react-toastify';
import ConfirmationModal from '../common/ConfirmationModal';
import PostClockRequestModal from './PostClockRequestModal';

const PostClockTab: React.FC = () => {
  const [postClockRequests, setPostClockRequests] = useState<PostClockRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [selectedPostClockId, setSelectedPostClockId] = useState<string | null>(null);

  const fetchPostClockRequests = async () => {
    try {
      setLoading(true);
      const response = await getMyPostClockRequests();
      setPostClockRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching postclock requests:', error);
      toast.error('無法載入補卡申請');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostClockRequests();
  }, []);

  const handleModalClose = () => {
    setIsModalOpen(false);
    fetchPostClockRequests();
  };

  const handleCancelClick = (postClockId: string) => {
    setSelectedPostClockId(postClockId);
    setCancelConfirmOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedPostClockId) return;

    try {
      await cancelPostClockRequest(selectedPostClockId);
      toast.success('補卡申請已取消');
      fetchPostClockRequests();
    } catch (error: any) {
      console.error('Error cancelling postclock request:', error);
      toast.error('取消失敗: ' + (error?.response?.data?.message || '未知錯誤'));
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

  const columns: GridColDef[] = [
    {
      field: 'sequenceNumber',
      headerName: '編號',
      flex: 1,
      valueGetter: (_, row) => `#${row.sequenceNumber || 'N/A'}`,
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
      field: 'status',
      headerName: '狀態',
      flex: 1,
      renderCell: (params) => getStatusChip(params.value),
      sortable: true
    },
    {
      field: 'rejectionReason',
      headerName: '說明',
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
      field: 'actions',
      type: 'actions',
      headerName: '操作',
      flex: 1,
      getActions: (params) => {
        const actions = [];

        if (params.row.status === 'created') {
          actions.push(
            <GridActionsCellItem
              icon={
                <Tooltip title="取消申請">
                  <DeleteIcon />
                </Tooltip>
              }
              label="取消申請"
              onClick={() => handleCancelClick(params.row._id)}
            />
          );
        }

        return actions;
      }
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          補卡申請
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsModalOpen(true)}
        >
          建立補卡申請
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={postClockRequests}
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
                noRowsLabel: '尚無補卡申請',
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

      <PostClockRequestModal
        open={isModalOpen}
        onClose={handleModalClose}
      />

      <ConfirmationModal
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={handleCancelConfirm}
        title="確認取消補卡申請"
        message="您確定要取消這個補卡申請嗎？此操作無法復原。"
        confirmText="確認取消"
        cancelText="保持申請"
        confirmColor="error"
      />
    </Box>
  );
};

export default PostClockTab;
