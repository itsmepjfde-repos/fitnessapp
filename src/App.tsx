import { useState } from 'react';
import { AddMemberModal } from './components/AddMemberModal';
import { BatchAttendanceScreen } from './components/BatchAttendanceScreen';
import { LoginScreen } from './components/LoginScreen';
import { MemberDirectoryScreen } from './components/MemberDirectoryScreen';
import { MemberHistoryDrawer } from './components/MemberHistoryDrawer';
import { ToastStack } from './components/ToastStack';
import { TopNav } from './components/TopNav';
import { usePortalStore } from './hooks/usePortalStore';

export default function App() {
  const {
    authStatus,
    session,
    activeView,
    selectedDate,
    members,
    checkIns,
    queuedMemberIds,
    outreachTemplate,
    latestDispatch,
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
  } = usePortalStore();

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [historyMemberId, setHistoryMemberId] = useState<string | null>(null);

  const historyMember =
    historyMemberId !== null
      ? members.find((m) => m.id === historyMemberId) ?? null
      : null;

  return (
    <div className="min-h-screen bg-[#090D16] text-[#DFE2EF] flex flex-col">
      {!session ? (
        <LoginScreen
          authStatus={authStatus}
          onSetupCoach={setupCoach}
          onSignIn={signIn}
        />
      ) : (
        <>
          <TopNav
            activeView={activeView}
            session={session}
            canResetDemo={authStatus?.storageMode === 'preview'}
            onSelectView={setActiveView}
            onResetDemo={resetDemoData}
            onSignOut={signOut}
          />

          <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {activeView === 'attendance' ? (
              <BatchAttendanceScreen
                selectedDate={selectedDate}
                members={members}
                checkIns={checkIns}
                queuedMemberIds={queuedMemberIds}
                onSelectDate={loadAttendanceForDate}
                onQueueMember={queueMember}
                onUnqueueMember={unqueueMember}
                onClearQueue={clearQueue}
                onConfirmBatchCheckIn={confirmBatchCheckIn}
                onSaveWorkouts={saveWorkoutTags}
                onRemoveCheckIn={removeCheckIn}
              />
            ) : (
              <MemberDirectoryScreen
                members={members}
                outreachTemplate={outreachTemplate}
                latestDispatch={latestDispatch}
                onUpdateTemplate={setOutreachTemplate}
                onDismissDispatch={dismissDispatchBanner}
                onSendOutreach={sendOutreach}
                onOpenAddMember={() => setAddMemberOpen(true)}
                onSelectHistoryMember={(id) => setHistoryMemberId(id)}
              />
            )}
          </main>

          <footer className="border-t border-white/[0.06] bg-[#0B0F19] py-4 px-4 sm:px-6 lg:px-8 no-print">
            <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
              <span>
                &copy; 2026{' '}
                <strong className="font-display tracking-tight">
                  <span className="text-[#EF233C]">DANNY&apos;</span>
                  <span className="text-white">ST</span>
                  <span className="text-[#EF233C]">HENICS</span>
                </strong>{' '}
                Coach Pro &middot; Calisthenics &amp; Conditioning
              </span>
            </div>
          </footer>
        </>
      )}

      {/* Tier-3 Interactive Overlays */}
      <AddMemberModal
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        onAddMember={addNewMember}
      />

      <MemberHistoryDrawer
        member={historyMember}
        onClose={() => setHistoryMemberId(null)}
        onSendOutreach={sendOutreach}
        onToggleWorkoutTag={toggleWorkoutTag}
        onJumpToAttendanceDate={(sessionDate) => {
          setActiveView('attendance');
          loadAttendanceForDate(sessionDate);
        }}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
