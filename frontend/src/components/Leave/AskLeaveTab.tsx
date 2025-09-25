import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import { LeaveRequest } from '../../types';
import LeaveRequestModal from './LeaveRequestModal';
import { getMyLeaveRequests } from '../../services/api';
import { toast } from 'react-toastify';
import { generateLeaveRequestDocx } from '../../utils/docxGenerator';

const AskLeaveTab: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'created':
        return <Chip label="待審核" color="warning" size="small" />;
      case 'approved':
        return <Chip label="已核准" color="success" size="small" />;
      case 'rejected':
        return <Chip label="已拒絕" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

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
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>請假類型</TableCell>
                  <TableCell>申請日期</TableCell>
                  <TableCell>請假開始</TableCell>
                  <TableCell>請假結束</TableCell>
                  <TableCell>請假時數</TableCell>
                  <TableCell>狀態</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      載入中...
                    </TableCell>
                  </TableRow>
                ) : leaveRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      尚無請假申請
                    </TableCell>
                  </TableRow>
                ) : (
                  leaveRequests.map((request) => (
                    <TableRow key={request._id}>
                      <TableCell>{request.leaveType}</TableCell>
                      <TableCell>
                        {request.YY}/{request.mm}/{request.DD}
                      </TableCell>
                      <TableCell>
                        {new Date(request.leaveStart).toLocaleString('zh-TW')}
                      </TableCell>
                      <TableCell>
                        {new Date(request.leaveEnd).toLocaleString('zh-TW')}
                      </TableCell>
                      <TableCell>
                        {request.hour}小時{request.minutes}分鐘
                      </TableCell>
                      <TableCell>
                        {getStatusChip(request.status)}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="下載請假單">
                          <IconButton
                            size="small"
                            onClick={() => handleDownload(request)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <LeaveRequestModal
        open={isModalOpen}
        onClose={handleModalClose}
      />
    </Box>
  );
};

export default AskLeaveTab;