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
import dayjs from 'dayjs';
import { PostClockRequest } from '../../types';
import { postClockAPI } from '../../services/api';
import { toast } from 'react-toastify';
import InputDialog from '../common/InputDialog';
import FilePreviewDialog from '../common/FilePreviewDialog';
import { getDepartmentDescription } from '@/services/variableService';

const getClockTypeLabel = (clockType: string) => {
  if (clockType === 'in') return '上班';
  if (clockType === 'out') return '下班';
  return '上下班';
};

const ApprovePostClockWitnessList: React.FC = () => {
  const [postClockRequests, setPostClockRequests] = useState<PostClockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PostClockRequest | null>(null);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await postClockAPI.getPendingWitness();
      setPostClockRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching pending witness requests:', error);
      toast.error('無法載入待證明人審核的補單申請');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleApproveClick = (request: PostClockRequest) => {
    setSelectedRequest(request);
    setApproveDialogOpen(true);
  };

  const handleApproveConfirm = async (memo: string) => {
    if (!selectedRequest) return;

    try {
      await postClockAPI.witnessApprove(selectedRequest._id!, memo || undefined);
      toast.success('已核准證明人審核');
      fetchPendingRequests();
    } catch (error: any) {
      console.error('Error approving as witness:', error);
      toast.error(error.response?.data?.message || '核准失敗');
      throw error;
    }
  };

  const handleRejectClick = (request: PostClockRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!selectedRequest) return;

    try {
      await postClockAPI.witnessReject(selectedRequest._id!, reason);
      toast.success('已拒絕證明人審核');
      fetchPendingRequests();
    } catch (error: any) {
      console.error('Error rejecting as witness:', error);
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
      field: 'date',
      headerName: '補單日期',
      flex: 1.5,
      valueGetter: (_, row) => dayjs(row.date).format('YYYY/MM/DD'),
      sortable: true
    },
    {
      field: 'time',
      headerName: '補單時間',
      flex: 1.5,
      valueGetter: (_, row) => {
        const time = row.time ? dayjs(row.time).format('HH:mm') : null;
        const time2 = row.time2 ? dayjs(row.time2).format('HH:mm') : null;
        if (time && time2) return `${time} - ${time2}`;
        return time || time2 || '-';
      },
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
            <Tooltip title="證明核准">
              <ApproveIcon color="success" />
            </Tooltip>
          }
          label="證明核准"
          onClick={() => handleApproveClick(params.row)}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="證明拒絕">
              <RejectIcon color="error" />
            </Tooltip>
          }
          label="證明拒絕"
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
              rows={postClockRequests}
              columns={columns}
              getRowId={(row) => row._id}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { page: 0, pageSize: 10 } },
                sorting: { sortModel: [{ field: 'date', sort: 'desc' }] }
              }}
              disableRowSelectionOnClick
              localeText={{ noRowsLabel: '目前沒有待證明人審核的補單申請' }}
            />
          </Box>
        </CardContent>
      </Card>

      <InputDialog
        open={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        onConfirm={handleApproveConfirm}
        title="確認證明核准"
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
              <Typography variant="body2" color="text.secondary">補單類型: {getClockTypeLabel(selectedRequest.clockType)}</Typography>
              <Typography variant="body2" color="text.secondary">
                補單日期: {dayjs(selectedRequest.date).format('YYYY/MM/DD')}
              </Typography>
            </Box>
          )
        }
      />

      <InputDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={handleRejectConfirm}
        title="拒絕證明審核"
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
              <Typography variant="body2" color="text.secondary">補單類型: {getClockTypeLabel(selectedRequest.clockType)}</Typography>
            </Box>
          )
        }
      />

      <FilePreviewDialog
        open={fileDialogOpen}
        onClose={() => setFileDialogOpen(false)}
        files={selectedFiles}
        title="補單佐證資料"
      />
    </Box>
  );
};

export default ApprovePostClockWitnessList;
