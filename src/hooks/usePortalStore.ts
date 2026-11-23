import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppView,
  AuthSession,
  AuthStatus,
  CheckInEntry,
  Member,
  OutreachDispatchBanner,
  ToastMessage,
  WorkoutKey,
  getTodayIsoDate,
} from '../types/portal';

const DEFAULT_OUTREACH_TEMPLATE =
  "Hey [First Name]! Coach Danny noticed you missed this week at DANNY'STHENICS. Please let me know if you have any questions or concerns. We hope to see you back in the studio soon!";

export function usePortalStore() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const tokenRef = useRef<string | null>(null);

  const [activeView, setActiveView] = useState<AppView>('attendance');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoDate);
  const [members, setMembers] = useState<Member[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>([]);
  const [queuedMemberIds, setQueuedMemberIds] = useState<string[]>([]);
  const [outreachTemplate, setOutreachTemplateState] = useState(
    DEFAULT_OUTREACH_TEMPLATE,
  );
  const [latestDispatch, setLatestDispatch] =
    useState<OutreachDispatchBanner | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [{ ...toast, id }, ...prev].slice(0, 3));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const apiFetch = useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const headers = new Headers(init?.headers || {});
      if (!headers.has('Content-Type') && init?.body) {
        headers.set('Content-Type', 'application/json');
      }
      if (tokenRef.current) {
        headers.set('Authorization', `Bearer ${tokenRef.current}`);
      }
      const res = await fetch(url, { ...init, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 && tokenRef.current) {
          tokenRef.current = null;
          setSession(null);
        }
        throw new Error(
          typeof data?.error === 'string' ? data.error : 'Request failed.',
        );
      }
      return data as T;
    },
    [],
  );

  // Check whether first-run coach setup is needed
  const refreshAuthStatus = useCallback(async () => {
    try {
      const status = await apiFetch<AuthStatus>('/api/auth/status');
      setAuthStatus(status);
    } catch {
      setAuthStatus({ storageMode: 'preview', needsSetup: false });
    }
  }, [apiFetch]);

  useEffect(() => {
    refreshAuthStatus();
  }, [refreshAuthStatus]);

  const loadWorkspaceData = useCallback(
    async (dateIso: string, seedInitialQueue = false) => {
      if (!tokenRef.current) return;
      setLoadingData(true);
      try {
        const [membersRes, attendanceRes, outreachRes] = await Promise.all([
          apiFetch<{ members: Member[] }>('/api/members'),
          apiFetch<{ sessionDate: string; checkIns: CheckInEntry[] }>(
            `/api/attendance?date=${encodeURIComponent(dateIso)}`,
          ),
          apiFetch<{
            template: string;
            latestDispatch: OutreachDispatchBanner | null;
          }>('/api/outreach/meta'),
        ]);

        setMembers(membersRes.members);
        setCheckIns(attendanceRes.checkIns);
        setOutreachTemplateState(outreachRes.template);
        setLatestDispatch((prev) => {
          if (!outreachRes.latestDispatch) return null;
          if (prev?.id === outreachRes.latestDispatch.id && prev.dismissed) {
            return prev;
          }
          return { ...outreachRes.latestDispatch, dismissed: false };
        });

        if (seedInitialQueue) {
          const checkedSet = new Set(attendanceRes.checkIns.map((c) => c.memberId));
          const defaultQueue = membersRes.members
            .filter((m) => ['#849', '#112', '#902'].includes(m.pfId) && !checkedSet.has(m.id))
            .map((m) => m.id);
          setQueuedMemberIds(defaultQueue);
        }
      } catch (err) {
        pushToast({
          title: 'Sync failed',
          detail: err instanceof Error ? err.message : 'Unable to reach studio server.',
          tone: 'crimson',
        });
      } finally {
        setLoadingData(false);
      }
    },
    [apiFetch, pushToast],
  );

  const loadAttendanceForDate = useCallback(
    async (dateIso: string) => {
      setSelectedDate(dateIso);
      setQueuedMemberIds([]);
      if (!tokenRef.current) return;
      try {
        const res = await apiFetch<{ sessionDate: string; checkIns: CheckInEntry[] }>(
          `/api/attendance?date=${encodeURIComponent(dateIso)}`,
        );
        setCheckIns(res.checkIns);
      } catch (err) {
        pushToast({
          title: 'Could not load attendance date',
          detail: err instanceof Error ? err.message : 'Please try again.',
          tone: 'crimson',
        });
      }
    },
    [apiFetch, pushToast],
  );

  const setupCoach = useCallback(
    async (input: {
      email: string;
      password: string;
      fullName: string;
      rememberMe: boolean;
    }): Promise<string | null> => {
      try {
        const res = await apiFetch<{ token: string; coach: AuthSession }>(
          '/api/auth/setup',
          {
            method: 'POST',
            body: JSON.stringify(input),
          },
        );
        tokenRef.current = res.token;
        setSession(res.coach);
        setAuthStatus((prev) => (prev ? { ...prev, needsSetup: false } : prev));
        setActiveView('attendance');
        const today = getTodayIsoDate();
        setSelectedDate(today);
        await loadWorkspaceData(today, true);
        pushToast({
          title: `Workstation initialized for ${res.coach.coachName}`,
          detail: 'Coach credentials securely hashed on the server.',
          tone: 'emerald',
        });
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Unable to complete coach setup.';
      }
    },
    [apiFetch, loadWorkspaceData, pushToast],
  );

  const signIn = useCallback(
    async (
      email: string,
      password: string,
      rememberMe: boolean,
    ): Promise<string | null> => {
      try {
        const res = await apiFetch<{ token: string; coach: AuthSession }>(
          '/api/auth/login',
          {
            method: 'POST',
            body: JSON.stringify({ email, password, rememberMe }),
          },
        );
        tokenRef.current = res.token;
        setSession(res.coach);
        setActiveView('attendance');
        const today = getTodayIsoDate();
        setSelectedDate(today);
        await loadWorkspaceData(today, true);
        pushToast({
          title: `Welcome back, ${res.coach.coachName}`,
          detail: 'Workstation connected to API.',
          tone: 'emerald',
        });
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Sign-in failed.';
      }
    },
    [apiFetch, loadWorkspaceData, pushToast],
  );

  const signOut = useCallback(() => {
    tokenRef.current = null;
    setSession(null);
    setQueuedMemberIds([]);
    refreshAuthStatus();
  }, [refreshAuthStatus]);

  const queueMember = useCallback(
    (memberId: string) => {
      if (checkIns.some((c) => c.memberId === memberId)) return;
      setQueuedMemberIds((prev) =>
        prev.includes(memberId) ? prev : [...prev, memberId],
      );
    },
    [checkIns],
  );

  const unqueueMember = useCallback((memberId: string) => {
    setQueuedMemberIds((prev) => prev.filter((id) => id !== memberId));
  }, []);

  const clearQueue = useCallback(() => {
    setQueuedMemberIds([]);
  }, []);

  const confirmBatchCheckIn = useCallback(async (checkInTime: string) => {
    if (queuedMemberIds.length === 0) return;
    try {
      const res = await apiFetch<{ addedCount: number; checkIns: CheckInEntry[] }>(
        '/api/attendance/batch',
        {
          method: 'POST',
          body: JSON.stringify({
            sessionDate: selectedDate,
            memberIds: queuedMemberIds,
            checkInTime,
          }),
        },
      );
      setCheckIns(res.checkIns);
      setQueuedMemberIds([]);
      // Refresh members so dynamic inactivity & attendance history stay in sync
      const membersRes = await apiFetch<{ members: Member[] }>('/api/members');
      setMembers(membersRes.members);

      if (res.addedCount > 0) {
        pushToast({
          title: `Checked in ${res.addedCount} ${res.addedCount === 1 ? 'athlete' : 'athletes'}`,
          detail: `Recorded for ${selectedDate} at ${checkInTime} IST.`,
          tone: 'emerald',
        });
      }
    } catch (err) {
      pushToast({
        title: 'Batch check-in failed',
        detail: err instanceof Error ? err.message : 'Please try again.',
        tone: 'crimson',
      });
    }
  }, [
    apiFetch,
    pushToast,
    queuedMemberIds,
    selectedDate,
  ]);

  const toggleWorkoutTag = useCallback(
    async (checkInId: string, workoutKey: WorkoutKey) => {
      try {
        const res = await apiFetch<{ checkIn: CheckInEntry }>(
          `/api/attendance/${encodeURIComponent(checkInId)}/workouts`,
          {
            method: 'PATCH',
            body: JSON.stringify({ workoutKey }),
          },
        );
        setCheckIns((prev) =>
          prev.map((c) => (c.id === checkInId ? res.checkIn : c)),
        );
        setMembers((prev) =>
          prev.map((m) =>
            m.id === res.checkIn.memberId
              ? {
                  ...m,
                  attendanceHistory: m.attendanceHistory.map((h) =>
                    h.checkInId === checkInId
                      ? { ...h, workouts: res.checkIn.workouts }
                      : h,
                  ),
                }
              : m,
          ),
        );
      } catch (err) {
        pushToast({
          title: 'Could not update workout tag',
          detail: err instanceof Error ? err.message : 'Please try again.',
          tone: 'crimson',
        });
      }
    },
    [apiFetch, pushToast],
  );

  const saveWorkoutTags = useCallback(
    async (
      checkInId: string,
      workouts: Record<WorkoutKey, boolean>,
    ): Promise<boolean> => {
      try {
        const res = await apiFetch<{ checkIn: CheckInEntry }>(
          `/api/attendance/${encodeURIComponent(checkInId)}/workouts`,
          {
            method: 'PATCH',
            body: JSON.stringify({ workouts }),
          },
        );
        setCheckIns((prev) =>
          prev.map((c) => (c.id === checkInId ? res.checkIn : c)),
        );
        setMembers((prev) =>
          prev.map((m) =>
            m.id === res.checkIn.memberId
              ? {
                  ...m,
                  attendanceHistory: m.attendanceHistory.map((h) =>
                    h.checkInId === checkInId
                      ? { ...h, workouts: res.checkIn.workouts }
                      : h,
                  ),
                }
              : m,
          ),
        );
        pushToast({
          title: 'Workouts saved',
          tone: 'emerald',
        });
        return true;
      } catch (err) {
        pushToast({
          title: 'Could not save workouts',
          detail: err instanceof Error ? err.message : 'Please try again.',
          tone: 'crimson',
        });
        return false;
      }
    },
    [apiFetch, pushToast],
  );

  const removeCheckIn = useCallback(
    async (checkInId: string) => {
      const target = checkIns.find((c) => c.id === checkInId);
      const member = target
        ? members.find((m) => m.id === target.memberId)
        : undefined;
      try {
        await apiFetch(`/api/attendance/${encodeURIComponent(checkInId)}`, {
          method: 'DELETE',
        });
        setCheckIns((prev) => prev.filter((c) => c.id !== checkInId));
        const membersRes = await apiFetch<{ members: Member[] }>('/api/members');
        setMembers(membersRes.members);
        pushToast({
          title: `Removed ${member?.name ?? 'athlete'} from ${selectedDate}`,
          detail: 'Check-in deleted and session credit restored if deducted.',
          tone: 'crimson',
        });
      } catch (err) {
        pushToast({
          title: 'Delete failed',
          detail: err instanceof Error ? err.message : 'Please try again.',
          tone: 'crimson',
        });
      }
    },
    [apiFetch, checkIns, members, pushToast, selectedDate],
  );

  const setOutreachTemplate = useCallback(
    async (template: string) => {
      setOutreachTemplateState(template);
      if (template.trim().length < 5) return;
      try {
        await apiFetch('/api/outreach/template', {
          method: 'PUT',
          body: JSON.stringify({ template }),
        });
      } catch {
        // Silent save error while typing
      }
    },
    [apiFetch],
  );

  const dismissDispatchBanner = useCallback(() => {
    setLatestDispatch((prev) => (prev ? { ...prev, dismissed: true } : null));
  }, []);

  const sendOutreach = useCallback(
    async (memberIds: string[], channel: 'WhatsApp' | 'SMS') => {
      if (memberIds.length === 0) return;
      try {
        const res = await apiFetch<{
          dispatch: OutreachDispatchBanner;
          count: number;
        }>('/api/outreach', {
          method: 'POST',
          body: JSON.stringify({ memberIds, channel }),
        });
        setLatestDispatch({ ...res.dispatch, dismissed: false });
        const membersRes = await apiFetch<{ members: Member[] }>('/api/members');
        setMembers(membersRes.members);
        pushToast({
          title: `${channel} outreach logged`,
          detail: `Sent to ${res.dispatch.recipientSummary} at ${res.dispatch.timestamp}.`,
          tone: 'emerald',
        });
      } catch (err) {
        pushToast({
          title: 'Outreach failed',
          detail: err instanceof Error ? err.message : 'Please try again.',
          tone: 'crimson',
        });
      }
    },
    [apiFetch, pushToast],
  );

  const addNewMember = useCallback(
    async (input: {
      name: string;
      phone: string;
    }) => {
      try {
        const res = await apiFetch<{ member: Member }>('/api/members', {
          method: 'POST',
          body: JSON.stringify(input),
        });
        setMembers((prev) => [res.member, ...prev]);
        pushToast({
          title: `${res.member.name} enrolled`,
          detail: `Member ID ${res.member.pfId}.`,
          tone: 'emerald',
        });
      } catch (err) {
        pushToast({
          title: 'Enrollment failed',
          detail: err instanceof Error ? err.message : 'Please try again.',
          tone: 'crimson',
        });
      }
    },
    [apiFetch, pushToast],
  );

  const resetDemoData = useCallback(async () => {
    try {
      await apiFetch('/api/demo/reset', { method: 'POST' });
      const today = getTodayIsoDate();
      setSelectedDate(today);
      await loadWorkspaceData(today, true);
      pushToast({
        title: 'Demo data restored',
        detail: 'Cohorts, date-wise check-ins, and workout tags reset.',
        tone: 'volt',
      });
    } catch (err) {
      pushToast({
        title: 'Reset unavailable',
        detail: err instanceof Error ? err.message : 'Not supported in live MySQL mode.',
        tone: 'crimson',
      });
    }
  }, [apiFetch, loadWorkspaceData, pushToast]);

  return {
    authStatus,
    session,
    activeView,
    selectedDate,
    members,
    checkIns,
    queuedMemberIds,
    outreachTemplate,
    latestDispatch,
    loadingData,
    toasts,
    dismissToast,
    setupCoach,
    signIn,
    signOut,
    setActiveView,
    loadAttendanceForDate,
    queueMember,
    unqueueMember,
    clearQueue,
    confirmBatchCheckIn,
    toggleWorkoutTag,
    saveWorkoutTags,
    removeCheckIn,
    setOutreachTemplate,
    dismissDispatchBanner,
    sendOutreach,
    addNewMember,
    resetDemoData,
  };
}
