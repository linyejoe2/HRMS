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
  Delete as DeleteIcon,
  GetApp as DownloadIcon,
  Attachment as AttachmentIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { BusinessTripRequest } from '../../types';
import { getMyBusinessTripRequests, cancelBusinessTripRequest } from '../../services/api';
import { toast } from 'react-toastify';
import ConfirmationModal from '../common/ConfirmationModal';
import BusinessTripRequestModal from './BusinessTripRequestModal';
import { generateBusinessTripRequestDocx } from '../../utils/docxGenerator';
import FilePreviewDialog from '../common/FilePreviewDialog';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';

const BusinessTripTab: React.FC = () => {
  const [businessTripRequests, setBusinessTripRequests] = useState<BusinessTripRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const fetchBusinessTripRequests = async () => {
    try {
      setLoading(true);
      const response = await getMyBusinessTripRequests();
      setBusinessTripRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching business trip requests:', error);
      toast.error('無法載入出差申請');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessTripRequests();
  }, []);

  const handleModalClose = () => {
    setIsModalOpen(false);
    fetchBusinessTripRequests();
  };

  const handleDownload = async (request: BusinessTripRequest) => {
    try {
      await generateBusinessTripRequestDocx(request);
      toast.success('出差申請單下載成功');
    } catch (error) {
      console.error('Error downloading business trip request:', error);
      toast.error('下載失敗: ' + (error as Error).message);
    }
  };

  const handleCancelClick = (tripId: string) => {
    setSelectedTripId(tripId);
    setCancelConfirmOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedTripId) return;

    try {
      await cancelBusinessTripRequest(selectedTripId);
      toast.success('出差申請已取消');
      fetchBusinessTripRequests();
    } catch (error: any) {
      console.error('Error cancelling business trip request:', error);
      toast.error('取消失敗: ' + (error?.response?.data?.message || '未知錯誤'));
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

  const columns: GridColDef[] = [
    {
      field: 'sequenceNumber',
      headerName: '編號',
      flex: 1,
      valueGetter: (_, row) => `#${row.sequenceNumber || 'N/A'}`,
      sortable: true
    },
    {
      field: 'destination',
      headerName: '目的地',
      flex: 1.5,
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
            {params.value?.length > 30
              ? `${params.value.substring(0, 30)}...`
              : params.value}
          </span>
        </Tooltip>
      ),
      sortable: false
    },
    {
      field: 'transportation',
      headerName: '交通方式',
      flex: 1,
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
      flex: 1,
      renderCell: (params) => getStatusChip(params.value),
      sortable: true
    },
    // {
    //   field: 'rejectionReason',
    //   headerName: '說明',
    //   flex: 2,
    //   renderCell: (params) => (
    //     params.value ? (
    //       <Tooltip title={params.value}>
    //         <span>
    //           {params.value?.length > 20
    //             ? `${params.value.substring(0, 20)}...`
    //             : params.value}
    //         </span>
    //       </Tooltip>
    //     ) : ''
    //   ),
    //   sortable: false
    // },
    {
      field: 'actions',
      type: 'actions',
      headerName: '操作',
      flex: 1,
      getActions: (params) => {
        const actions = [];

        actions.push(
          <GridActionsCellItem
            icon={
              <Tooltip title="下載出差申請單">
                <DownloadIcon color='primary' />
              </Tooltip>
            }
            label="下載出差申請單"
            onClick={() => handleDownload(params.row)}
          />
        );

        if (params.row.status === 'created') {
          actions.push(
            <GridActionsCellItem
              icon={
                <Tooltip title="取消申請">
                  <DeleteIcon color="error" />
                </Tooltip>
              }
              label="取消申請"
              onClick={() => handleCancelClick(params.row._id)}
            />
          );
        } else {
          actions.push(
            <GridActionsCellItem
              icon={
                <Tooltip title="請聯繫管理部">
                    <DeleteIcon color="disabled" />
                </Tooltip>
              }
              label="取消申請"
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
          出差申請
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsModalOpen(true)}
        >
          建立出差申請
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={businessTripRequests}
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
                noRowsLabel: '尚無出差申請',
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

      <BusinessTripRequestModal
        open={isModalOpen}
        onClose={handleModalClose}
      />

      <ConfirmationModal
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={handleCancelConfirm}
        title="確認取消出差申請"
        message="您確定要取消這個出差申請嗎？此操作無法復原。"
        confirmText="確認取消"
        cancelText="保持申請"
        confirmColor="error"
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

export default BusinessTripTab;
