import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { leaveAPI, postClockAPI, businessTripAPI, officialBusinessAPI, approvalAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { UserLevel } from '../types';

export interface PendingApprovalCounts {
  substitute?: number;
  postclockwitness?: number;
  manager?: number;
  leave?: number;
  postclock?: number;
  travel?: number;
  officialbusiness?: number;
}

// Fetches 審核中心 pending-approval counts per tab (代理/證明/主管審核 for everyone,
// plus the 4 HR/Admin-only review tabs), refetched on every navigation. Shared by
// AppLayout's sidebar badges and ApproveLeaveTab's tab badges.
export const usePendingApprovalCounts = (): PendingApprovalCounts => {
  const { user } = useAuth();
  const location = useLocation();
  const [counts, setCounts] = useState<PendingApprovalCounts>({});

  useEffect(() => {
    if (!user) return;

    const isAdminOrHr = user.role === UserLevel.ADMIN || user.role === UserLevel.HR;

    const fetchCounts = async () => {
      try {
        const next: PendingApprovalCounts = {};
        const tasks: Promise<void>[] = [
          leaveAPI.getPendingSubstitute().then(res => { next.substitute = res.data.data.length; }),
          postClockAPI.getPendingWitness().then(res => { next.postclockwitness = res.data.data.length; }),
          approvalAPI.getPendingManagerAll().then(res => { next.manager = res.data.data.length; }),
        ];

        if (isAdminOrHr) {
          tasks.push(
            leaveAPI.getAll('created').then(res => { next.leave = res.data.data.length; }),
            postClockAPI.getAll('created').then(res => { next.postclock = res.data.data.length; }),
            businessTripAPI.getAll('created').then(res => { next.travel = res.data.data.length; }),
            officialBusinessAPI.getAll('created').then(res => { next.officialbusiness = res.data.data.length; }),
          );
        }

        await Promise.all(tasks);
        setCounts(next);
      } catch (error) {
        console.error('Error fetching pending approval counts:', error);
      }
    };

    fetchCounts();
  }, [user, location.pathname]);

  return counts;
};
