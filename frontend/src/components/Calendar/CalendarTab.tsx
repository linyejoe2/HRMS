import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  CircularProgress
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { EventClickArg, DatesSetArg } from '@fullcalendar/core';
import toast from 'react-hot-toast';
import { holidayService, Holiday } from '../../services/holidayService';
import { HolidayModal } from './HolidayModal';

// Color mapping for holiday types
const HOLIDAY_TYPE_COLORS: Record<string, string> = {
  '國定假日': '#f44336', // Red
  '例假日': '#2196f3',   // Blue
  '特殊假日': '#ff9800'  // Orange
};

export const CalendarTab: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  // Load holidays
  const loadHolidays = async (start?: string, end?: string) => {
    setLoading(true);
    try {
      let data
      if (start && end) { data = await holidayService.getHolidaysByDateRange(start, end) }
      else { data = await holidayService.getAllHolidays() }
      setHolidays(data);
    } catch (error: any) {
      console.error('Error loading holidays:', error);
      toast.error(error.response?.data?.message || '載入假日失敗');
    } finally {
      setLoading(false);
    }
  };

  // Load all holidays on mount
  useEffect(() => {
    loadHolidays();
  }, []);

  // Handle date range change (when user navigates calendar)
  // This fires on initial mount and whenever the user navigates the calendar
  const handleDatesSet = (arg: DatesSetArg) => {
    const start = arg.startStr;
    const end = arg.endStr;
    setDateRange({ start, end });
    loadHolidays(start, end);
  };

  // Handle event (holiday) click
  const handleEventClick = (info: EventClickArg) => {
    const holiday = info.event.extendedProps.holiday as Holiday;
    setEditingHoliday(holiday);
    setModalOpen(true);
  };

  // Handle create new holiday
  const handleCreateHoliday = () => {
    setEditingHoliday(null);
    setModalOpen(true);
  };

  // Handle modal close with refresh
  const handleModalClose = () => {
    setModalOpen(false);
    setEditingHoliday(null);
  };

  const handleModalSave = () => {
    // Reload holidays for current date range
    if (dateRange) {
      loadHolidays(dateRange.start, dateRange.end);
    }
  };

  // Convert holidays to FullCalendar events
  const events = holidays.map(holiday => ({
    id: holiday._id,
    title: holiday.name,
    date: holiday.date,
    backgroundColor: HOLIDAY_TYPE_COLORS[holiday.type] || '#9e9e9e',
    borderColor: HOLIDAY_TYPE_COLORS[holiday.type] || '#9e9e9e',
    extendedProps: {
      holiday
    }
  }));

  if (loading && holidays.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          假日管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateHoliday}
        >
          新增假日
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listMonth'
          }}
          events={events}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          height="auto"
          locale="zh-tw"
          buttonText={{
            today: '今天',
            month: '月',
            list: '列表'
          }}
          noEventsContent="無假日"
          eventDisplay="block"
          displayEventTime={false}
        />
      </Paper>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: HOLIDAY_TYPE_COLORS['國定假日'],
              borderRadius: 1
            }}
          />
          <Typography variant="body2">國定假日</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: HOLIDAY_TYPE_COLORS['例假日'],
              borderRadius: 1
            }}
          />
          <Typography variant="body2">例假日</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: HOLIDAY_TYPE_COLORS['特殊假日'],
              borderRadius: 1
            }}
          />
          <Typography variant="body2">特殊假日</Typography>
        </Box>
      </Box>

      {/* <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={handleCreateHoliday}
      >
        <AddIcon />
      </Fab> */}

      <HolidayModal
        open={modalOpen}
        holiday={editingHoliday}
        onClose={handleModalClose}
        onSaved={handleModalSave}
      />
    </Container>
  );
};
