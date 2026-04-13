"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Booking = {
  id: string;
  amount: number | string;
  court: {
    id: string;
    name: string;
    location: string;
    pricePerHour: number | string;
  };
  slot: {
    id: string;
    startTime: string;
    endTime: string;
    status: string;
  };
};

function formatBookingTime(value: string) {
  return new Date(value).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadBookings = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch("/api/my-bookings");
        const data = (await response.json()) as {
          bookings?: Booking[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch bookings.");
        }

        if (isMounted) {
          setBookings(data.bookings ?? []);
        }
      } catch (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : "Failed to fetch bookings.";

        if (isMounted) {
          setError(message);
          setBookings([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadBookings();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
                Find Team to Play
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">My Bookings</h1>
            </div>

            <Link
              href="/discover"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back to Courts
            </Link>
          </div>
        </header>

        <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {isLoading ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Loading your bookings...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <p className="text-base font-semibold text-slate-900">No bookings yet</p>
              <p className="mt-2 text-sm text-slate-500">
                Your upcoming matches and court reservations will appear here.
              </p>
              <Link
                href="/discover"
                className="mt-5 inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Browse Courts
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {bookings.map((booking) => (
                <article
                  key={booking.id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 ring-1 ring-emerald-200">
                        Confirmed Booking
                      </div>
                      <h2 className="mt-3 text-lg font-bold text-slate-900">
                        {booking.court.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">{booking.court.location}</p>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Price
                      </p>
                      <p className="mt-1 text-base font-bold text-slate-900">
                        Rs. {booking.court.pricePerHour}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Match Time
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatBookingTime(booking.slot.startTime)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Status
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {booking.slot.status}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
