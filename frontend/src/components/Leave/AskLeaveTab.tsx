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
import { DataGrid, GridColDef, GridRenderCellParams, GridRowParams, GridActionsCellItem } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  GetApp as DownloadIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { LeaveRequest } from '../../types';
import LeaveRequestModal from './LeaveRequestModal';
import { getMyLeaveRequests, cancelLeaveRequest } from '../../services/api';
import { toast } from 'react-toastify';
import { generateLeaveRequestDocx } from '../../utils/docxGenerator';
import InputDialog from '../common/InputDialog';

const AskLeaveTab: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await getMyLeaveRequests();
      setLeaveRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('無法載入請假申請');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const handleModalClose = () => {
    setIsModalOpen(false);
    fetchLeaveRequests();
  };

  const handleDownload = async (request: LeaveRequest) => {
    try {
      await generateLeaveRequestDocx(request);
      toast.success('請假單下載成功');
    } catch (error) {
      console.error('Error downloading leave request:', error);
      toast.error('下載失敗: ' + (error as Error).message);
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
      toast.success('請假申請已取消');
      fetchLeaveRequests(); // Refresh the list
    } catch (error) {
      console.error('Error cancelling leave request:', error);
      toast.error('取消失敗: ' + (error as any)?.response?.data?.message || '未知錯誤');
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

  // DataGrid column definitions
  const columns: GridColDef[] = [
    {
      field: 'sequenceNumber',
      headerName: '編號',
      flex: 1,
      valueGetter: (_, row) => `#${row.sequenceNumber || 'N/A'}`
    },
    {
      field: 'leaveType',
      headerName: '請假類型',
      flex: 1,
    },
    {
      field: 'requestDate',
      headerName: '申請日期',
      flex: 1,
      valueGetter: (_, row) => `${row.YY}/${row.mm}/${row.DD}`
    },
    {
      field: 'leaveStart',
      headerName: '請假開始',
      flex: 1.5,
      valueGetter: (_, row) => new Date(row.leaveStart).toLocaleString('zh-TW')
    },
    {
      field: 'leaveEnd',
      headerName: '請假結束',
      flex: 1.5,
      valueGetter: (_, row) => new Date(row.leaveEnd).toLocaleString('zh-TW')
    },
    {
      field: 'reason',
      headerName: '請假理由',
      flex: 1.5,
    },
    {
      field: 'duration',
      headerName: '請假時數',
      flex: 1,
      valueGetter: (_, row) => `${row.hour}小時${row.minutes}分鐘`
    },
    {
      field: 'status',
      headerName: '狀態',
      flex: 1,
      renderCell: (params: GridRenderCellParams) => getStatusChip(params.row.status),
    },
    {
      field: 'rejectionReason',
      headerName: '說明',
      flex: 1.5,
      valueGetter: (_, row) => row.rejectionReason ?? ""
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '操作',
      flex: 1,
      sortable: false,
      filterable: false,
      // renderCell: (params: GridRenderCellParams) => (
      //   <Box sx={{ display: 'flex', gap: 1 }}>
      //     <GridActionsCellItem
      //       icon={
      //         <Tooltip title="下載請假單">
      //           <DownloadIcon />
      //         </Tooltip>
      //       }
      //       label="下載請假單"
      //       onClick={() => handleDownload(params.row)}
      //     />
      //     {params.row.status === 'created' && (
      // <GridActionsCellItem
      //   icon={
      //     <Tooltip title="取消申請">
      //       <DeleteIcon />
      //     </Tooltip>
      //   }
      //   label="取消申請"
      //   onClick={() => handleCancelClick(params.row._id ?? "")}
      // />
      //     )}
      //   </Box>
      // ),
      getActions: (params: GridRowParams) => {
        const actions = [];
        actions.push(
          <GridActionsCellItem
            icon={
              <Tooltip title="下載請假單">
                <DownloadIcon />
              </Tooltip>
            }
            label="下載請假單"
            onClick={() => handleDownload(params.row)}
          />
        );

        // Allow cancel from created, approved, and rejected states
        if (params.row.status !== 'cancel') {
          actions.push(
            <GridActionsCellItem
              icon={
                <Tooltip title="取消申請">
                  <DeleteIcon />
                </Tooltip>
              }
              label="取消申請"
              onClick={() => handleCancelClick(params.row)}
            />
          );
        }

        return actions;
      }
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          請假申請
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsModalOpen(true)}
        >
          建立請假申請
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            請假記錄 ({leaveRequests.length} 筆)
          </Typography>

          <Box sx={{ width: '100%' }}>
            <DataGrid
              rows={leaveRequests.map((request, index) => ({
                id: request._id || index,
                ...request
              }))}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 25 },
                },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              checkboxSelection={false}
              disableRowSelectionOnClick
              loading={loading}
              sx={{
                '& .MuiDataGrid-cell': {
                  borderRight: 1,
                  borderColor: 'divider',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'action.hover',
                  borderBottom: 2,
                  borderColor: 'divider',
                },
              }}
              slots={{
                noRowsOverlay: () => (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                    }}
                  >
                    <Typography color="text.secondary">
                      {loading ? '載入中...' : '尚無請假申請'}
                    </Typography>
                  </Box>
                ),
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <LeaveRequestModal
        open={isModalOpen}
        onClose={handleModalClose}
      />

      <InputDialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelConfirm}
        title="確認取消請假申請"
        label="取消原因"
        placeholder="請說明取消原因..."
        confirmText="確認取消"
        cancelText="保持申請"
        confirmColor="error"
        required={true}
        detailsContent={
          selectedRequest && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                請假類型: {selectedRequest.leaveType}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                請假時間: {new Date(selectedRequest.leaveStart).toLocaleDateString('zh-TW')}
                至 {new Date(selectedRequest.leaveEnd).toLocaleDateString('zh-TW')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                當前狀態: {getStatusChip(selectedRequest.status)}
              </Typography>
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                {selectedRequest.status === 'approved' && '注意：此請假已核准，取消將撤銷核准狀態'}
                {selectedRequest.status === 'rejected' && '注意：此請假已拒絕'}
                {selectedRequest.status === 'created' && '此操作無法復原'}
              </Typography>
            </Box>
          )
        }
      />
    </Box>
  );
};

export default AskLeaveTab;