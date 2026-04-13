"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SchedulePageProps = {
  params: {
    courtId: string;
  };
};

type SlotStatus = "AVAILABLE" | "BOOKED";

type Slot = {
  id: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  booking: null | {
    id: string;
    user: {
      name: string;
      phoneNumber: string;
    };
  };
};

function formatToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeLabel(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function SchedulePage({ params }: SchedulePageProps) {
  const [selectedDate, setSelectedDate] = useState(formatToday());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    const booked = slots.filter((slot) => slot.status === "BOOKED").length;
    return {
      total: slots.length,
      booked,
      available: slots.length - booked,
    };
  }, [slots]);

  const fetchSlots = async (date: string) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/schedule?courtId=${params.courtId}&date=${date}`,
      );
      const data = (await response.json()) as {
        slots?: Slot[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch slots.");
      }

      setSlots(data.slots ?? []);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Failed to fetch slots.";
      setError(message);
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSlots(selectedDate);
  }, [params.courtId, selectedDate]);

  const handleGenerateSlots = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courtId: params.courtId,
          date: selectedDate,
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate slots.");
      }

      await fetchSlots(selectedDate);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Failed to generate slots.";
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
                Find Team to Play
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Schedule Management</h1>
              <p className="mt-1 text-sm text-slate-500">Court ID: {params.courtId}</p>
            </div>

            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Daily Slot Generator</h2>
              <p className="mt-1 text-sm text-slate-500">
                Pick a date and preview the time blocks you want to publish.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="selected-date"
                  className="block text-sm font-medium text-slate-700"
                >
                  Select Date
                </label>
                <input
                  id="selected-date"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateSlots}
                disabled={isLoading}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                {isLoading ? "Loading..." : "Generate Daily Slots"}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Total
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900">{summary.total}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                  Available
                </p>
                <p className="mt-2 text-xl font-bold text-emerald-700">{summary.available}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600">
                  Booked
                </p>
                <p className="mt-2 text-xl font-bold text-amber-700">{summary.booked}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Slots for {selectedDate}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Live 1-hour slots for the selected court and date.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                1 hour slots
              </span>
            </div>

            {slots.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No slots generated for this date yet. Click above to generate.
              </div>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {slots.map((slot) => (
                  <article
                    key={slot.id}
                    className={`rounded-[22px] border px-4 py-4 ${
                      slot.status === "AVAILABLE"
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-amber-300 bg-amber-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          {formatTimeLabel(slot.startTime)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Until {formatTimeLabel(slot.endTime)}
                        </p>
                        {slot.status === "BOOKED" && slot.booking?.user ? (
                          <div className="mt-3 space-y-1">
                            <p className="text-sm font-semibold text-amber-950">
                              {slot.booking.user.name}
                            </p>
                            <p className="text-sm text-amber-900">
                              {slot.booking.user.phoneNumber}
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          slot.status === "AVAILABLE"
                            ? "bg-white text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-white text-amber-900 ring-1 ring-amber-300"
                        }`}
                      >
                        {slot.status}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
