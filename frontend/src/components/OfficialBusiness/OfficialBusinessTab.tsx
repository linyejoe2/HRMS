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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import GetAppIcon from '@mui/icons-material/GetApp';
import EditIcon from '@mui/icons-material/Edit';
import { officialBusinessAPI } from '../../services/api';
import { OfficialBusinessRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import OfficialBusinessRequestModal from './OfficialBusinessRequestModal';
import FilePreviewDialog from '../common/FilePreviewDialog';
import { generateOfficialBusinessRequestDocx } from '../../utils/docxGenerator';

const OfficialBusinessTab: React.FC = () => {
  const { user } = useAuth();

  // State
  const [requests, setRequests] = useState<OfficialBusinessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Edit return time dialog
  const [endTimeDialogOpen, setEndTimeDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<OfficialBusinessRequest | null>(null);
  const [editEndTime, setEditEndTime] = useState<Dayjs | null>(null);
  const [savingEndTime, setSavingEndTime] = useState(false);

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

  // Handle edit return time
  const handleEditEndTime = (request: OfficialBusinessRequest) => {
    setEditingRequest(request);
    setEditEndTime(request.endTime ? dayjs(request.endTime) : null);
    setEndTimeDialogOpen(true);
  };

  const handleSaveEndTime = async () => {
    if (!editingRequest?._id || !editEndTime) return;

    setSavingEndTime(true);
    try {
      await officialBusinessAPI.updateEndTime(editingRequest._id, editEndTime.toISOString());
      toast.success('返回時間已更新');
      setEndTimeDialogOpen(false);
      setEditingRequest(null);
      loadRequests();
    } catch (error: any) {
      console.error('Error updating return time:', error);
      toast.error(error.response?.data?.message || '更新返回時間失敗');
    } finally {
      setSavingEndTime(false);
    }
  };

  // Handle view files
  const handleViewFiles = (files: string[]) => {
    setSelectedFiles(files);
    setFilePreviewOpen(true);
  };

  // Handle download
  const handleDownload = async (request: OfficialBusinessRequest) => {
    try {
      await generateOfficialBusinessRequestDocx(request);
      toast.success('外出申請單下載成功');
    } catch (error) {
      console.error('Error downloading official business request:', error);
      toast.error('下載失敗: ' + (error as Error).message);
    }
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
      valueGetter: (_, row) => row.endTime ? new Date(row.endTime).toLocaleString('zh-TW') : ''
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
      flex: 1.2,
      minWidth: 120,
      getActions: (params) => {
        const actions = [];

        actions.push(
          <GridActionsCellItem
            icon={
              <Tooltip title="下載外出申請單">
                <GetAppIcon color="primary" />
              </Tooltip>
            }
            label="下載外出申請單"
            onClick={() => handleDownload(params.row)}
          />
        );


        actions.push(
          <GridActionsCellItem
            icon={
              <Tooltip title="填寫/修改返回時間">
                <EditIcon color="primary" />
              </Tooltip>
            }
            label="填寫/修改返回時間"
            onClick={() => handleEditEndTime(params.row)}
          />
        );

        // Only the applicant can fill in/adjust the return time while it's pending approval
        // if (params.row.status === 'created' && params.row.applicant === user?.empID) {
        //   actions.push(
        //     <GridActionsCellItem
        //       icon={
        //         <Tooltip title="填寫/修改返回時間">
        //           <EditIcon color="primary" />
        //         </Tooltip>
        //       }
        //       label="填寫/修改返回時間"
        //       onClick={() => handleEditEndTime(params.row)}
        //     />
        //   );
        // }

        // Only show cancel for 'created' status and if user is the applicant
        if (params.row.status === 'created' && params.row.applicant === user?.empID) {
          actions.push(
            <GridActionsCellItem
              icon={
                <Tooltip title="取消申請">
                  <DeleteIcon color="error" />
                </Tooltip>
              }
              label="取消申請"
              onClick={() => handleCancelRequest(params.row._id, params.row.applicant)}
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

      {/* Edit Return Time Dialog */}
      <Dialog
        open={endTimeDialogOpen}
        onClose={() => setEndTimeDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>填寫/修改返回時間</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker
              label="返回時間"
              value={editEndTime}
              onChange={(newValue) => setEditEndTime(newValue)}
              format="YYYY/MM/DD HH:mm"
              timeSteps={{ minutes: 1 }}
              ampm={false}
              minDateTime={editingRequest ? dayjs(editingRequest.startTime) : undefined}
              shouldDisableDate={(date) =>
                editingRequest ? !date.isSame(dayjs(editingRequest.startTime), 'day') : false
              }
              slotProps={{
                textField: {
                  required: true,
                  fullWidth: true,
                  sx: { mt: 1 },
                  helperText: '必須與外出時間同一天，且晚於外出時間'
                }
              }}
            />
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEndTimeDialogOpen(false)} disabled={savingEndTime}>
            取消
          </Button>
          <Button
            onClick={handleSaveEndTime}
            variant="contained"
            disabled={savingEndTime || !editEndTime}
          >
            {savingEndTime ? '儲存中...' : '儲存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OfficialBusinessTab;
