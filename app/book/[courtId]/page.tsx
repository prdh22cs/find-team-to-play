"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BookingPageProps = {
  params: {
    courtId: string;
  };
};

type Slot = {
  id: string;
  startTime: string;
  endTime: string;
  status: "AVAILABLE" | "HELD" | "BOOKED";
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

export default function BookingPage({ params }: BookingPageProps) {
  const [selectedDate, setSelectedDate] = useState(formatToday());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    const available = slots.filter((slot) => slot.status === "AVAILABLE").length;
    const booked = slots.filter((slot) => slot.status === "BOOKED").length;
    return {
      total: slots.length,
      available,
      booked,
    };
  }, [slots]);

  const fetchSlots = async (date: string) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/schedule?courtId=${params.courtId}&date=${date}`);
      const data = (await response.json()) as {
        slots?: Slot[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Failed to load slots.");
      }

      setSlots(data.slots ?? []);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Failed to load slots.";
      setError(message);
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSlots(selectedDate);
  }, [params.courtId, selectedDate]);

  const handleBookSlot = async (slotId: string) => {
    setBookingSlotId(slotId);
    setError("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slotId,
          courtId: params.courtId,
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Failed to book slot.");
      }

      alert("Slot booked successfully!");
      await fetchSlots(selectedDate);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Failed to book slot.";
      setError(message);
    } finally {
      setBookingSlotId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
                Find Team to Play
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Book a Court</h1>
              <p className="mt-1 text-sm text-slate-500">Court ID: {params.courtId}</p>
            </div>

            <Link
              href="/discover"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back to Discover
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Select a Date</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a day to view available booking slots for this court.
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
                  Booking Date
                </label>
                <input
                  id="selected-date"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </div>
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
              <div className="rounded-2xl bg-slate-200 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                  Booked
                </p>
                <p className="mt-2 text-xl font-bold text-slate-700">{summary.booked}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Slots for {selectedDate}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tap an available slot to complete your booking instantly.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                Live availability
              </span>
            </div>

            {isLoading ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Loading slots...
              </div>
            ) : slots.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No slots generated for this date yet.
              </div>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {slots.map((slot) => {
                  const isAvailable = slot.status === "AVAILABLE";
                  const isSubmitting = bookingSlotId === slot.id;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={!isAvailable || isSubmitting}
                      onClick={() => void handleBookSlot(slot.id)}
                      className={`rounded-[22px] border px-4 py-4 text-left transition ${
                        isAvailable
                          ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                          : "cursor-not-allowed border-slate-200 bg-slate-100 opacity-80"
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
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            isAvailable
                              ? "bg-white text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-white text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          {isSubmitting ? "BOOKING" : slot.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
