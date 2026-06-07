export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-8 h-8 rounded-full border-2 border-hairline animate-spin"
          style={{ borderTopColor: "#6b7aff" }}
        />
        <span className="label-caps text-ink-ghost">INDRA loading</span>
      </div>
    </div>
  );
}
