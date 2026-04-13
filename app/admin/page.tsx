"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Court = {
  id: string;
  name: string;
  location: string;
  pricePerHour: number | string;
};

type Analytics = {
  totalBookings: number;
  totalRevenue: number;
  peakHours: Array<{
    hour: string;
    count: number;
  }>;
};

export default function AdminPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<"COURTS" | "ADD_COURT">("COURTS");
  const [myCourts, setMyCourts] = useState<Court[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalBookings: 0,
    totalRevenue: 0,
    peakHours: [],
  });
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [courtName, setCourtName] = useState("");
  const [location, setLocation] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    void fetchMyCourts();
    void fetchAnalytics();
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setSuccessMessage("");
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const fetchMyCourts = async () => {
    try {
      const response = await fetch("/api/courts?filter=my-courts");
      const data = (await response.json()) as {
        courts?: Court[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Failed to load courts.");
      }

      setMyCourts(data.courts ?? []);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Failed to load courts.";
      setError(message);
    }
  };

  const fetchAnalytics = async () => {
    setIsAnalyticsLoading(true);

    try {
      const response = await fetch("/api/admin/analytics");
      const data = (await response.json()) as Partial<Analytics> & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Failed to load analytics.");
      }

      setAnalytics({
        totalBookings: data.totalBookings ?? 0,
        totalRevenue: data.totalRevenue ?? 0,
        peakHours: data.peakHours ?? [],
      });
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Failed to load analytics.";
      setError(message);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const handleAddCourt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const trimmedName = courtName.trim();
    const trimmedLocation = location.trim();
    const parsedPrice = Number(pricePerHour);

    if (!trimmedName || !trimmedLocation || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setError("Please provide a valid court name, location, and hourly price.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/courts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          location: trimmedLocation,
          pricePerHour: parsedPrice,
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Failed to save court.");
      }

      setCourtName("");
      setLocation("");
      setPricePerHour("");
      setSuccessMessage("Court added successfully!");
      await fetchMyCourts();
      setActiveView("COURTS");
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Failed to save court.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to log out.");
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to log out.";
      alert(message);
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
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Owner Command Center</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveView("COURTS")}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    activeView === "COURTS"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  My Courts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("ADD_COURT")}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    activeView === "ADD_COURT"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  Add New Court
                </button>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="text-sm font-medium text-gray-500 transition hover:text-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="mt-6 space-y-6">
          {isAnalyticsLoading ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 h-10 w-40 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 h-10 w-32 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="mt-5 space-y-3">
                  <div className="h-10 animate-pulse rounded bg-slate-100" />
                  <div className="h-10 animate-pulse rounded bg-slate-100" />
                  <div className="h-10 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
                  Total Revenue
                </p>
                <p className="mt-4 text-4xl font-bold text-slate-900">
                  Rs. {analytics.totalRevenue}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Revenue generated across all booked courts.
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Total Bookings
                </p>
                <p className="mt-4 text-4xl font-bold text-slate-900">
                  {analytics.totalBookings}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Total confirmed slot bookings across your venues.
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Peak Hours</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Most frequently booked time blocks across your courts.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    Top 5
                  </span>
                </div>

                {analytics.peakHours.length === 0 ? (
                  <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    No booking activity yet to calculate peak hours.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {analytics.peakHours.map((entry) => {
                      const width = Math.max(
                        20,
                        (entry.count / analytics.peakHours[0].count) * 100,
                      );

                      return (
                        <div
                          key={entry.hour}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-semibold text-slate-900">{entry.hour}</p>
                            <p className="text-sm text-slate-500">{entry.count} bookings</p>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-slate-200">
                            <div
                              className="h-2 rounded-full bg-emerald-500"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className={`${activeView === "ADD_COURT" ? "order-2 xl:order-1" : ""}`}>
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">My Courts</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review your listed venues and jump into scheduling quickly.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  {myCourts.length} Active
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {myCourts.map((court) => (
                  <article
                    key={court.id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{court.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{court.location}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm ring-1 ring-slate-200">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Price
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          Rs. {court.pricePerHour}/hr
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Link
                        href={`/admin/schedule/${court.id}`}
                        className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Manage Schedule
                      </Link>
                      <button
                        type="button"
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {myCourts.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  You have not added any courts yet.
                </div>
              ) : null}
            </div>
          </div>

          <div className={`${activeView === "ADD_COURT" ? "order-1 xl:order-2" : ""}`}>
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Add New Court</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a listing with the essential details your players need first.
                </p>
              </div>

              <form className="mt-6 space-y-5" onSubmit={handleAddCourt}>
                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                  </div>
                ) : null}

                <div>
                  <label htmlFor="court-name" className="block text-sm font-medium text-slate-700">
                    Court Name
                  </label>
                  <input
                    id="court-name"
                    type="text"
                    value={courtName}
                    onChange={(event) => setCourtName(event.target.value)}
                    placeholder="Turf Republic"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-slate-700">
                    Location
                  </label>
                  <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Koramangala, Bengaluru"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="price-per-hour"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Price Per Hour
                  </label>
                  <input
                    id="price-per-hour"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={pricePerHour}
                    onChange={(event) => setPricePerHour(event.target.value)}
                    placeholder="1400"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  {isSaving ? "Saving..." : "Save Court"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
