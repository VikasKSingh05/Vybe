export default function RootLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-4 text-white/60">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
        <p className="text-sm">Loading VYBE…</p>
      </div>
    </div>
  );
}
