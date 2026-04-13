"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Court = {
  id: string;
  name: string;
  location: string;
  pricePerHour: number | string;
};

type MatchPost = {
  id: string;
  postType: "SOLO" | "INCOMPLETE" | "CHALLENGE";
  content: string;
  location: string;
  matchTime: string;
  user: {
    name: string;
    phoneNumber: string;
  };
};

const badgeStyles: Record<MatchPost["postType"], string> = {
  SOLO: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  INCOMPLETE: "bg-amber-50 text-amber-700 ring-amber-200",
  CHALLENGE: "bg-sky-50 text-sky-700 ring-sky-200",
};

const postTypeLabels: Record<MatchPost["postType"], string> = {
  SOLO: "Solo Player",
  INCOMPLETE: "Incomplete Team",
  CHALLENGE: "Complete Team Challenge",
};

const courtAccents = [
  "from-emerald-500 to-lime-400",
  "from-cyan-500 to-sky-500",
  "from-orange-500 to-amber-400",
  "from-fuchsia-500 to-rose-400",
];

export default function DiscoverPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"COURTS" | "MATCHBOARD">("COURTS");
  const [currentCity, setCurrentCity] = useState("Biratnagar");
  const [query, setQuery] = useState("");
  const [courts, setCourts] = useState<Court[]>([]);
  const [matchPosts, setMatchPosts] = useState<MatchPost[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postType, setPostType] = useState<MatchPost["postType"]>("SOLO");
  const [postContent, setPostContent] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [postMatchTime, setPostMatchTime] = useState("");
  const [postError, setPostError] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCourts = async () => {
      try {
        const response = await fetch(`/api/courts?city=${encodeURIComponent(currentCity)}`);
        const data = (await response.json()) as {
          courts?: Court[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch courts.");
        }

        if (isMounted) {
          setCourts(data.courts ?? []);
        }
      } catch (error) {
        console.error("Failed to load courts:", error);
      }
    };

    void loadCourts();

    return () => {
      isMounted = false;
    };
  }, [currentCity]);

  useEffect(() => {
    let isMounted = true;

    const loadPosts = async () => {
      try {
        const response = await fetch("/api/matchboard");
        const data = (await response.json()) as {
          posts?: MatchPost[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch matchboard posts.");
        }

        if (isMounted) {
          setMatchPosts(data.posts ?? []);
        }
      } catch (error) {
        console.error("Failed to load matchboard posts:", error);
      }
    };

    void loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadMatchPosts = async () => {
    const response = await fetch("/api/matchboard");
    const data = (await response.json()) as {
      posts?: MatchPost[];
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch matchboard posts.");
    }

    setMatchPosts(data.posts ?? []);
  };

  const filteredCourts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return courts;
    }

    return courts.filter((court) =>
      `${court.name} ${court.location}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  const handleCreatePost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPostError("");

    if (!postContent.trim() || !postLocation.trim() || !postMatchTime.trim()) {
      setPostError("Please fill in all matchboard fields.");
      return;
    }

    setIsPosting(true);

    try {
      const response = await fetch("/api/matchboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postType,
          content: postContent.trim(),
          location: postLocation.trim(),
          matchTime: postMatchTime.trim(),
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Failed to create post.");
      }

      setPostContent("");
      setPostLocation("");
      setPostMatchTime("");
      setPostType("SOLO");
      setShowCreatePost(false);
      await loadMatchPosts();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create post.";
      setPostError(message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    const confirmed = window.confirm("Are you sure?");

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/matchboard?id=${postId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete post.");
      }

      await loadMatchPosts();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete post.";
      alert(message);
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffffff,_#eef7f2_42%,_#e6eef8)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-10 -mx-4 border-b border-white/60 bg-slate-50/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
                Find Team to Play
              </p>
              <h1 className="mt-1 text-xl font-bold text-slate-900">Player Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={currentCity}
                onChange={(event) => setCurrentCity(event.target.value)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm outline-none ring-1 ring-slate-200 transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="All">All Cities</option>
                <option value="Biratnagar">Biratnagar</option>
                <option value="Kathmandu">Kathmandu</option>
                <option value="Pokhara">Pokhara</option>
                <option value="Bengaluru">Bengaluru</option>
              </select>
              <Link
                href="/my-bookings"
                className="text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900"
              >
                My Bookings
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="text-sm font-medium text-gray-500 transition hover:text-red-600"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="mx-auto mt-4 grid w-full max-w-6xl grid-cols-2 gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("COURTS")}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === "COURTS"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Courts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("MATCHBOARD")}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === "MATCHBOARD"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Matchboard
            </button>
          </div>
        </header>

        {activeTab === "COURTS" ? (
          <section className="pt-6">
            <div className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Book a Court</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Find nearby futsal venues, compare prices, and grab your slot.
                  </p>
                </div>
                <div className="w-full sm:max-w-xs">
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by location"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCourts.map((court, index) => (
                <article
                  key={court.id}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div
                    className={`h-40 bg-gradient-to-br ${courtAccents[index % courtAccents.length]} p-5`}
                  >
                    <div className="flex h-full items-end rounded-[22px] border border-white/30 bg-black/10 p-4 backdrop-blur-[1px]">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-800">
                        Futsal Court
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{court.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{court.location}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          Price / hour
                        </p>
                        <p className="mt-1 text-xl font-bold text-slate-900">
                          Rs. {court.pricePerHour}
                        </p>
                      </div>
                      <Link
                        href={`/book/${court.id}`}
                        className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {filteredCourts.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-white/80 px-4 py-10 text-center text-sm text-slate-500">
                No courts match that location yet. Try another area.
              </div>
            ) : null}
          </section>
        ) : (
          <section className="pt-6">
            <div className="rounded-[28px] border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Matchboard</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Find teammates, fill your lineup, or challenge another full squad.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreatePost((current) => !current)}
                  className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
                >
                  {showCreatePost ? "Close Form" : "Create Post"}
                </button>
              </div>
            </div>

            {showCreatePost ? (
              <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <form className="space-y-4" onSubmit={handleCreatePost}>
                  {postError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {postError}
                    </div>
                  ) : null}

                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Post Type
                    </label>
                    <select
                      value={postType}
                      onChange={(event) =>
                        setPostType(event.target.value as MatchPost["postType"])
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="SOLO">Solo Player</option>
                      <option value="INCOMPLETE">Incomplete Team</option>
                      <option value="CHALLENGE">Complete Team Challenge</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Description</label>
                    <textarea
                      value={postContent}
                      onChange={(event) => setPostContent(event.target.value)}
                      rows={4}
                      placeholder="Describe what kind of players or match you are looking for."
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Location</label>
                      <input
                        type="text"
                        value={postLocation}
                        onChange={(event) => setPostLocation(event.target.value)}
                        placeholder="Koramangala"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Match Time</label>
                      <input
                        type="text"
                        value={postMatchTime}
                        onChange={(event) => setPostMatchTime(event.target.value)}
                        placeholder="Tonight, 8:30 PM"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPosting}
                    className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    {isPosting ? "Posting..." : "Publish Post"}
                  </button>
                </form>
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              {matchPosts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badgeStyles[post.postType]}`}
                      >
                        {postTypeLabels[post.postType]}
                      </span>
                      <p className="mt-3 text-base font-semibold leading-7 text-slate-900">
                        {post.content}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
                        <span className="rounded-full bg-slate-100 px-3 py-1">{post.matchTime}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">{post.location}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">{post.user.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={`https://wa.me/${post.user.phoneNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Message
                      </a>
                      <button
                        type="button"
                        onClick={() => void handleDeletePost(post.id)}
                        className="text-sm font-semibold text-red-600 transition hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
