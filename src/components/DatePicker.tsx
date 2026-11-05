export function DatePicker({
  dateKey,
  basePath = "/schedule",
}: {
  dateKey: string;
  basePath?: string;
}) {
  return (
    <form action={basePath} method="get" className="flex items-center gap-2">
      <input
        key={dateKey}
        type="date"
        name="date"
        defaultValue={dateKey}
        aria-label="Pick date"
        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm hover:bg-slate-50"
      >
        Go
      </button>
    </form>
  );
}
