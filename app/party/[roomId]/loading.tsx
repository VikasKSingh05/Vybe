export default function PartyRoomLoading() {
  return (
    <div className="flex h-dvh items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <p className="text-sm text-white/50">Joining party…</p>
      </div>
    </div>
  );
}
