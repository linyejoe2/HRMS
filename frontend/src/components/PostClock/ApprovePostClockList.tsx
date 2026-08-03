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
  TextField,
  IconButton,
  Badge,
  Button
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Attachment as AttachmentIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { PostClockRequest } from '../../types';
import { getAllPostClockRequests, approvePostClockRequest, rejectPostClockRequest, cancelPostClockRequest } from '../../services/api';
import { toast } from 'react-toastify';
import InputDialog from '../common/InputDialog';
import FilePreviewDialog from '../common/FilePreviewDialog';
import PostClockRequestModal from './PostClockRequestModal';
import { fuzzySearchApproval } from '@/utils/fuzzySearch';
import { getDepartmentDescription, getDepartments } from '@/services/variableService';

const ApprovePostClockList: React.FC = () => {
  const [postClockRequests, setPostClockRequests] = useState<PostClockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PostClockRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>('created');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  // const [departments, setDepartments] = useState<Variable[]>([]);

  const fetchPostClockRequests = async (status?: string) => {
    try {
      setLoading(true);
      const response = await getAllPostClockRequests(status);
      setPostClockRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching postclock requests:', error);
      toast.error('無法載入補單申請');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostClockRequests(statusFilter || undefined);
  }, [statusFilter]);

  // Load departments on mount
  useEffect(() => {
    // const loadDepartments = async () => {
    //   try {
    //     const response = await variableAPI.getAll(undefined, false);
    //     const allVariables = response.data.data.variables;
    //     const departmentVars = allVariables.filter((v: Variable) => v.section === 'department');
    //     setDepartments(departmentVars);
    //   } catch (err: any) {
    //     console.error('Failed to load departments:', err);
    //   }
    // };
    getDepartments();
  }, []);

  // Lookup department description by code
  // const getDepartmentDescription = (departmentCode?: string): string => {
  //   if (!departmentCode) return '-';
  //   const department = departments.find(dept => dept.code === departmentCode);
  //   return department?.description || departmentCode;
  // };

  const handleApproveClick = (request: PostClockRequest) => {
    setSelectedRequest(request);
    setApproveDialogOpen(true);
  };

  const handleApproveConfirm = async (_: string, files?: File[]) => {
    if (!selectedRequest) return;

    try {
      await approvePostClockRequest(selectedRequest._id!, files);
      toast.success('補單申請已核准');
      fetchPostClockRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error approving postclock request:', error);
      const message = error.response?.data?.message || '核准失敗';
      toast.error(message);
      throw error;
    }
  };

  const handleRejectClick = (request: PostClockRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason: string, files?: File[]) => {
    if (!selectedRequest) return;

    try {
      await rejectPostClockRequest(selectedRequest._id!, reason, files);
      toast.success('補單申請已拒絕');
      fetchPostClockRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error rejecting postclock request:', error);
      const message = error.response?.data?.message || '拒絕失敗';
      toast.error(message);
      throw error;
    }
  };

  const handleCancelClick = (request: PostClockRequest) => {
    setSelectedRequest(request);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!selectedRequest) return;

    try {
      await cancelPostClockRequest(selectedRequest._id!, reason);
      toast.success('補單申請已抽單');
      fetchPostClockRequests(statusFilter || undefined);
    } catch (error: any) {
      console.error('Error cancelling postclock request:', error);
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

  const getClockTypeLabel = (clockType: string) => {
    if (clockType === 'in') return '上班';
    if (clockType === 'out') return '下班';
    return '上下班';
  };

  const handleStatusFilterChange = (_: React.MouseEvent<HTMLElement>, newValue: string | null) => {
    setStatusFilter(newValue);
  };

  const filteredPostClockRequests = postClockRequests.filter(request =>
    fuzzySearchApproval(request, searchQuery)
  );

  const columns: GridColDef[] = [
    {
      field: 'sequenceNumber',
      headerName: '編號',
      flex: 1,
      valueGetter: (_, row) => `#${row.sequenceNumber || 'N/A'}`,
      sortable: true
    },
    {
      field: 'empID',
      headerName: '員編',
      flex: 0.8,
      sortable: true
    },
    {
      field: 'name',
      headerName: '員工姓名',
      flex: 0.8,
      sortable: true
    },
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
      field: 'status',
      headerName: '狀態',
      flex: 1,
      renderCell: (params) => getStatusChip(params.value),
      sortable: true
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '操作',
      flex: 2,
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
              placeholder="搜尋編號、員工編號、姓名或部門 (空格分隔多個關鍵字)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 400 }}
            />

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateModalOpen(true)}
              sx={{ ml: 'auto' }}
            >
              新增並核准
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={filteredPostClockRequests}
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
                noRowsLabel: statusFilter
                  ? `目前沒有${statusFilter === 'created' ? '待審核' : statusFilter === 'approved' ? '已核准' : '已拒絕'}的補單申請`
                  : '沒有補單申請資料',
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
        title="確認核准補單申請"
        label="備註（選填）"
        placeholder="可填寫備註資訊..."
        confirmText="確認核准"
        cancelText="取消"
        confirmColor="success"
        required={false}
        allowFileUpload={true}
        fileUploadLabel="附加檔案（選填）"
        detailsContent={
          selectedRequest && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                員工: {selectedRequest.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                補單類型: {getClockTypeLabel(selectedRequest.clockType)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                補單日期: {dayjs(selectedRequest.date).format('YYYY/MM/DD')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                補單時間: {dayjs(selectedRequest.time).format('HH:mm:ss')}
              </Typography>
              {selectedRequest.clockType === 'in&out' && selectedRequest.date2 && selectedRequest.time2 && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    補單日期(下班): {dayjs(selectedRequest.date2).format('YYYY/MM/DD')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    補單時間(下班): {dayjs(selectedRequest.time2).format('HH:mm:ss')}
                  </Typography>
                </>
              )}
            </Box>
          )
        }
      />

      {/* Reject Dialog */}
      <InputDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={handleRejectConfirm}
        title="拒絕補單申請"
        label="拒絕原因"
        placeholder="請說明拒絕此補單申請的原因..."
        confirmText="確認拒絕"
        cancelText="取消"
        confirmColor="error"
        required={true}
        allowFileUpload={true}
        fileUploadLabel="附加檔案（選填）"
        detailsContent={
          selectedRequest && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                員工: {selectedRequest.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                補單類型: {getClockTypeLabel(selectedRequest.clockType)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                補單日期: {dayjs(selectedRequest.date).format('YYYY/MM/DD')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                補單時間: {dayjs(selectedRequest.time).format('HH:mm:ss')}
              </Typography>
              {selectedRequest.clockType === 'in&out' && selectedRequest.date2 && selectedRequest.time2 && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    補單日期(下班): {dayjs(selectedRequest.date2).format('YYYY/MM/DD')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    補單時間(下班): {dayjs(selectedRequest.time2).format('HH:mm:ss')}
                  </Typography>
                </>
              )}
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
                補單類型: {getClockTypeLabel(selectedRequest.clockType)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                當前狀態: {getStatusChip(selectedRequest.status)}
              </Typography>
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                {selectedRequest.status === 'approved' && '注意：此補單已核准，抽單將撤銷核准狀態'}
                {selectedRequest.status === 'rejected' && '注意：此補單已拒絕，抽單將移除此記錄'}
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
        title="補單佐證資料"
      />

      {/* HR Create & Auto-Approve Modal */}
      <PostClockRequestModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          fetchPostClockRequests(statusFilter || undefined);
        }}
        hrMode
      />
    </Box>
  );
};

export default ApprovePostClockList;
