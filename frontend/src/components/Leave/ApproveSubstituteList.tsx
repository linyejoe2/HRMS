import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Tooltip, Typography } from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Attachment as AttachmentIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import { LeaveRequest } from '../../types';
import { leaveAPI } from '../../services/api';
import { toast } from 'react-toastify';
import InputDialog from '../common/InputDialog';
import FilePreviewDialog from '../common/FilePreviewDialog';
import { getDepartmentDescription } from '@/services/variableService';
import { leaveDisplaynameConverter } from '@/services/leaveService';

const ApproveSubstituteList: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await leaveAPI.getPendingSubstitute();
      setLeaveRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching pending substitute requests:', error);
      toast.error('無法載入待代理審核的請假申請');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleApproveClick = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setApproveDialogOpen(true);
  };

  const handleApproveConfirm = async (memo: string) => {
    if (!selectedRequest) return;

    try {
      await leaveAPI.substituteApprove(selectedRequest._id!, memo || undefined);
      toast.success('已核准代理審核');
      fetchPendingRequests();
    } catch (error: any) {
      console.error('Error approving as substitute:', error);
      toast.error(error.response?.data?.message || '核准失敗');
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
      await leaveAPI.substituteReject(selectedRequest._id!, reason);
      toast.success('已拒絕代理審核');
      fetchPendingRequests();
    } catch (error: any) {
      console.error('Error rejecting as substitute:', error);
      toast.error(error.response?.data?.message || '拒絕失敗');
      throw error;
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
    { field: 'empID', headerName: '員編', flex: 0.6, sortable: true },
    { field: 'name', headerName: '員工姓名', flex: 0.8, sortable: true },
    {
      field: 'department',
      headerName: '部門',
      flex: 0.8,
      valueGetter: (_, row) => getDepartmentDescription(row.department),
      sortable: true
    },
    {
      field: 'leaveType',
      headerName: '請假類型',
      flex: 1,
      valueGetter: (_, row) => leaveDisplaynameConverter(row.leaveType),
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
      flex: 1,
      valueGetter: (_, row) => `${row.hour}小時`,
      sortable: false
    },
    {
      field: 'reason',
      headerName: '原因',
      flex: 2,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <span>
            {params.value?.length > 30 ? `${params.value.substring(0, 30)}...` : params.value}
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
      field: 'actions',
      type: 'actions',
      headerName: '操作',
      flex: 1.2,
      getActions: (params) => [
        <GridActionsCellItem
          icon={
            <Tooltip title="代理核准">
              <ApproveIcon color="success" />
            </Tooltip>
          }
          label="代理核准"
          onClick={() => handleApproveClick(params.row)}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="代理拒絕">
              <RejectIcon color="error" />
            </Tooltip>
          }
          label="代理拒絕"
          onClick={() => handleRejectClick(params.row)}
        />
      ]
    }
  ];

  return (
    <Box>
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
                pagination: { paginationModel: { page: 0, pageSize: 10 } },
                sorting: { sortModel: [{ field: 'leaveStart', sort: 'desc' }] }
              }}
              disableRowSelectionOnClick
              localeText={{ noRowsLabel: '目前沒有待代理審核的請假申請' }}
            />
          </Box>
        </CardContent>
      </Card>

      <InputDialog
        open={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        onConfirm={handleApproveConfirm}
        title="確認代理核准"
        label="備註（選填）"
        placeholder="可填寫備註資訊..."
        confirmText="確認核准"
        cancelText="取消"
        confirmColor="success"
        required={false}
        detailsContent={
          selectedRequest && (
            <Box>
              <Typography variant="body2" color="text.secondary">員工: {selectedRequest.name}</Typography>
              <Typography variant="body2" color="text.secondary">請假類型: {leaveDisplaynameConverter(selectedRequest.leaveType)}</Typography>
              <Typography variant="body2" color="text.secondary">
                請假時間: {new Date(selectedRequest.leaveStart).toLocaleDateString('zh-TW')} 至 {new Date(selectedRequest.leaveEnd).toLocaleDateString('zh-TW')}
              </Typography>
            </Box>
          )
        }
      />

      <InputDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={handleRejectConfirm}
        title="拒絕代理審核"
        label="拒絕原因"
        placeholder="請說明拒絕的原因..."
        confirmText="確認拒絕"
        cancelText="取消"
        confirmColor="error"
        required={true}
        detailsContent={
          selectedRequest && (
            <Box>
              <Typography variant="body2" color="text.secondary">員工: {selectedRequest.name}</Typography>
              <Typography variant="body2" color="text.secondary">請假類型: {leaveDisplaynameConverter(selectedRequest.leaveType)}</Typography>
            </Box>
          )
        }
      />

      <FilePreviewDialog
        open={fileDialogOpen}
        onClose={() => setFileDialogOpen(false)}
        files={selectedFiles}
        title="請假佐證資料"
      />
    </Box>
  );
};

export default ApproveSubstituteList;
