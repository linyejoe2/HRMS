import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { LeaveRequest } from '../types';
import { toTaipeiString } from '@/utility';

export const generateLeaveRequestDocx = async (leaveRequest: LeaveRequest): Promise<void> => {
  try {
    // Load the template file from public directory
    const templateUrl = '/templates/leaveRequest.docx';
    const response = await fetch(templateUrl);

    if (!response.ok) {
      throw new Error(`無法載入請假單範本 (HTTP ${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Check if we got a valid arrayBuffer
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('請假單範本文件為空或無法讀取');
    }

    console.log('Template file size:', arrayBuffer.byteLength, 'bytes');

    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater().loadZip(zip);

    // Calculate leave duration in a more readable format
    // const leave = new Date(leaveRequest.leaveStart);
    // const endDate = new Date(leaveRequest.leaveEnd);
    // const duration = `${leaveRequest.hour}小時${leaveRequest.minutes}分鐘`;

    const templateData = {
      ...leaveRequest,
      leaveStart: toTaipeiString(leaveRequest.leaveStart),
      leaveEnd: toTaipeiString(leaveRequest.leaveEnd)
    }
    // // Prepare template data
    // const templateData = {
    //   name: leaveRequest.name,
    //   empID: leaveRequest.empID,
    //   department: leaveRequest.department || '',
    //   leaveType: leaveRequest.leaveType,
    //   reason: leaveRequest.reason,
    //   ㄍㄠ
    // };

    // Fill the template with data
    doc.setData(templateData);

    try {
      doc.render();
    } catch (error) {
      console.error('DOCX 渲染錯誤：', error);
      throw new Error('請假單範本處理失敗，請檢查範本格式');
    }

    // Generate the document
    const output = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    // Create download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(output);
    link.download = `請假單${leaveRequest.YY}_${leaveRequest.mm}_${leaveRequest.DD}_${leaveRequest.name}.docx`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error('生成請假單失敗：', error);
    throw error;
  }
};

// const getStatusText = (status: string): string => {
//   switch (status) {
//     case 'created':
//       return '待審核';
//     case 'approved':
//       return '已核准';
//     case 'rejected':
//       return '已拒絕';
//     default:
//       return status;
//   }
// };