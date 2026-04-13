export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Find Team to Play
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Next.js app scaffold is ready.
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Your App Router project, Prisma setup, and auth API routes are now in place.
        </p>
      </div>
    </main>
  );
}
