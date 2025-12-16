import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { LeaveRequest, PostClockRequest, BusinessTripRequest } from '../types';
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
    link.download = `請假單_${leaveRequest.YYYY}_${leaveRequest.mm}_${leaveRequest.DD}_${leaveRequest.name}.docx`;

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

export const generatePostClockRequestDocx = async (postClockRequest: PostClockRequest): Promise<void> => {
  try {
    // Load the template file from public directory
    const templateUrl = '/templates/postClockRequest.docx';
    const response = await fetch(templateUrl);

    if (!response.ok) {
      throw new Error(`無法載入補單申請範本 (HTTP ${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Check if we got a valid arrayBuffer
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('補單申請範本文件為空或無法讀取');
    }

    console.log('Template file size:', arrayBuffer.byteLength, 'bytes');

    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater().loadZip(zip);

    const createdDate = new Date(postClockRequest.createdAt || Date.now());
    const templateData = {
      ...postClockRequest,
      time: new Date(postClockRequest.time).toLocaleString('zh-TW'),
      type: postClockRequest.clockType === 'in' ? '上班' : '下班',
      sequenceNumber: `#${postClockRequest.sequenceNumber || 'N/A'}`,
      YYYY: createdDate.getFullYear(),
      mm: String(createdDate.getMonth() + 1).padStart(2, '0'),
      DD: String(createdDate.getDate()).padStart(2, '0')
    };

    // Fill the template with data
    doc.setData(templateData);

    try {
      doc.render();
    } catch (error) {
      console.error('DOCX 渲染錯誤：', error);
      throw new Error('補單申請範本處理失敗，請檢查範本格式');
    }

    // Generate the document
    const output = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    // Create download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(output);
    const dateStr = new Date(postClockRequest.date).toLocaleDateString('zh-TW').replace(/\//g, '_');
    link.download = `補單_${dateStr}_${postClockRequest.name}.docx`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error('生成補單申請失敗：', error);
    throw error;
  }
};

export const generateBusinessTripRequestDocx = async (businessTripRequest: BusinessTripRequest): Promise<void> => {
  try {
    // Load the template file from public directory
    const templateUrl = '/templates/businessTripRequest.docx';
    const response = await fetch(templateUrl);

    if (!response.ok) {
      throw new Error(`無法載入出差申請範本 (HTTP ${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Check if we got a valid arrayBuffer
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('出差申請範本文件為空或無法讀取');
    }

    console.log('Template file size:', arrayBuffer.byteLength, 'bytes');

    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater().loadZip(zip);

    const createdDate = new Date(businessTripRequest.createdAt || Date.now());
    const templateData = {
      ...businessTripRequest,
      YYYY: createdDate.getFullYear(),
      mm: String(createdDate.getMonth() + 1).padStart(2, '0'),
      DD: String(createdDate.getDate()).padStart(2, '0'),
      start: new Date(businessTripRequest.tripStart).toLocaleString('zh-TW'),
      end: new Date(businessTripRequest.tripEnd).toLocaleString('zh-TW'),
      estimatedCost: businessTripRequest.estimatedCost
        ? `NT$ ${businessTripRequest.estimatedCost.toLocaleString()}`
        : '-',
      sequenceNumber: `#${businessTripRequest.sequenceNumber || 'N/A'}`
    };

    // Fill the template with data
    doc.setData(templateData);

    try {
      doc.render();
    } catch (error) {
      console.error('DOCX 渲染錯誤：', error);
      throw new Error('出差申請範本處理失敗，請檢查範本格式');
    }

    // Generate the document
    const output = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    // Create download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(output);
    const startDate = new Date(businessTripRequest.tripStart).toLocaleDateString('zh-TW').replace(/\//g, '_');
    link.download = `出差單_${startDate}_${businessTripRequest.name}.docx`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error('生成出差申請失敗：', error);
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