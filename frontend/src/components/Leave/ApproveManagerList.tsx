import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Chip, Tooltip, Typography } from '@mui/material';
import { Check as ApproveIcon, Close as RejectIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import {
  BusinessTripRequest,
  LeaveRequest,
  OfficialBusinessRequest,
  PendingManagerItem,
  PendingManagerRequestType,
  PostClockRequest
} from '../../types';
import { approvalAPI, businessTripAPI, leaveAPI, officialBusinessAPI, postClockAPI } from '../../services/api';
import { toast } from 'react-toastify';
import InputDialog from '../common/InputDialog';
import { getDepartmentDescription } from '@/services/variableService';
import { leaveDisplaynameConverter } from '@/services/leaveService';

const REQUEST_TYPE_LABELS: Record<PendingManagerRequestType, string> = {
  leave: '請假',
  businessTrip: '因公免刷卡',
  postClock: '補單',
  officialBusiness: '外出'
};

const managerApproveMap = {
  leave: leaveAPI.managerApprove,
  businessTrip: businessTripAPI.managerApprove,
  postClock: postClockAPI.managerApprove,
  officialBusiness: officialBusinessAPI.managerApprove
};

const managerRejectMap = {
  leave: leaveAPI.managerReject,
  businessTrip: businessTripAPI.managerReject,
  postClock: postClockAPI.managerReject,
  officialBusiness: officialBusinessAPI.managerReject
};

const getRequesterEmpID = (item: PendingManagerItem): string =>
  item.requestType === 'officialBusiness'
    ? (item.data as OfficialBusinessRequest).applicant
    : (item.data as LeaveRequest | BusinessTripRequest | PostClockRequest).empID;

const getRequesterName = (item: PendingManagerItem): string =>
  item.requestType === 'officialBusiness'
    ? (item.data as OfficialBusinessRequest).applicantName
    : (item.data as LeaveRequest | BusinessTripRequest | PostClockRequest).name;

const getDetail = (item: PendingManagerItem): string => {
  switch (item.requestType) {
    case 'leave': {
      const data = item.data as LeaveRequest;
      return `${leaveDisplaynameConverter(data.leaveType)}：${new Date(data.leaveStart).toLocaleDateString('zh-TW')} 至 ${new Date(data.leaveEnd).toLocaleDateString('zh-TW')}`;
    }
    case 'businessTrip': {
      const data = item.data as BusinessTripRequest;
      return `${data.destination}：${new Date(data.tripStart).toLocaleDateString('zh-TW')} 至 ${new Date(data.tripEnd).toLocaleDateString('zh-TW')}`;
    }
    case 'postClock': {
      const data = item.data as PostClockRequest;
      return `${data.clockType}：${new Date(data.date).toLocaleDateString('zh-TW')}`;
    }
    case 'officialBusiness': {
      const data = item.data as OfficialBusinessRequest;
      return `${data.purpose}：${new Date(data.startTime).toLocaleDateString('zh-TW')}${data.endTime ? ` 至 ${new Date(data.endTime).toLocaleDateString('zh-TW')}` : ''}`;
    }
    default:
      return '';
  }
};

const ApproveManagerList: React.FC = () => {
  const [items, setItems] = useState<PendingManagerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingManagerItem | null>(null);

  const fetchPendingItems = async () => {
    try {
      setLoading(true);
      const response = await approvalAPI.getPendingManagerAll();
      setItems(response.data.data);
    } catch (error) {
      console.error('Error fetching pending manager approvals:', error);
      toast.error('無法載入待主管審核清單');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const handleApproveClick = (item: PendingManagerItem) => {
    setSelectedItem(item);
    setApproveDialogOpen(true);
  };

  const handleApproveConfirm = async (memo: string) => {
    if (!selectedItem) return;

    try {
      await managerApproveMap[selectedItem.requestType](selectedItem.data._id!, memo || undefined);
      toast.success('已核准主管審核');
      fetchPendingItems();
    } catch (error: any) {
      console.error('Error approving as manager:', error);
      toast.error(error.response?.data?.message || '核准失敗');
      throw error;
    }
  };

  const handleRejectClick = (item: PendingManagerItem) => {
    setSelectedItem(item);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!selectedItem) return;

    try {
      await managerRejectMap[selectedItem.requestType](selectedItem.data._id!, reason);
      toast.success('已拒絕主管審核');
      fetchPendingItems();
    } catch (error: any) {
      console.error('Error rejecting as manager:', error);
      toast.error(error.response?.data?.message || '拒絕失敗');
      throw error;
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'requestType',
      headerName: '類型',
      flex: 0.8,
      renderCell: (params) => <Chip label={REQUEST_TYPE_LABELS[params.value as PendingManagerRequestType]} size="small" />,
      sortable: true
    },
    {
      field: 'sequenceNumber',
      headerName: '編號',
      flex: 0.8,
      valueGetter: (_, row: PendingManagerItem) => `#${row.data.sequenceNumber ?? 'N/A'}`,
      sortable: false
    },
    {
      field: 'empID',
      headerName: '員編',
      flex: 0.6,
      valueGetter: (_, row: PendingManagerItem) => getRequesterEmpID(row),
      sortable: false
    },
    {
      field: 'name',
      headerName: '姓名',
      flex: 0.8,
      valueGetter: (_, row: PendingManagerItem) => getRequesterName(row),
      sortable: false
    },
    {
      field: 'department',
      headerName: '部門',
      flex: 0.8,
      valueGetter: (_, row: PendingManagerItem) => getDepartmentDescription(row.data.department),
      sortable: false
    },
    {
      field: 'detail',
      headerName: '申請內容',
      flex: 2.5,
      renderCell: (params) => {
        const detail = getDetail(params.row);
        return (
          <Tooltip title={detail}>
            <span>{detail}</span>
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
            <Tooltip title="主管核准">
              <ApproveIcon color="success" />
            </Tooltip>
          }
          label="主管核准"
          onClick={() => handleApproveClick(params.row)}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="主管拒絕">
              <RejectIcon color="error" />
            </Tooltip>
          }
          label="主管拒絕"
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
              rows={items}
              columns={columns}
              getRowId={(row: PendingManagerItem) => `${row.requestType}-${row.data._id}`}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
              disableRowSelectionOnClick
              localeText={{ noRowsLabel: '目前沒有待主管審核的申請' }}
            />
          </Box>
        </CardContent>
      </Card>

      <InputDialog
        open={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        onConfirm={handleApproveConfirm}
        title="確認主管核准"
        label="備註（選填）"
        placeholder="可填寫備註資訊..."
        confirmText="確認核准"
        cancelText="取消"
        confirmColor="success"
        required={false}
        detailsContent={
          selectedItem && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                類型: {REQUEST_TYPE_LABELS[selectedItem.requestType]}
              </Typography>
              <Typography variant="body2" color="text.secondary">員工: {getRequesterName(selectedItem)}</Typography>
              <Typography variant="body2" color="text.secondary">內容: {getDetail(selectedItem)}</Typography>
            </Box>
          )
        }
      />

      <InputDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={handleRejectConfirm}
        title="拒絕主管審核"
        label="拒絕原因"
        placeholder="請說明拒絕的原因..."
        confirmText="確認拒絕"
        cancelText="取消"
        confirmColor="error"
        required={true}
        detailsContent={
          selectedItem && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                類型: {REQUEST_TYPE_LABELS[selectedItem.requestType]}
              </Typography>
              <Typography variant="body2" color="text.secondary">員工: {getRequesterName(selectedItem)}</Typography>
            </Box>
          )
        }
      />
    </Box>
  );
};

export default ApproveManagerList;
