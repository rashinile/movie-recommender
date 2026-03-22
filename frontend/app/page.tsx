"use client";

import { useState } from "react";
import Image from "next/image";

type Recommendation = {
  title: string;
  posterUrl?: string;
};

export default function Home() {
  const [movieName, setMovieName] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchPosterForMovie(title: string): Promise<string | undefined> {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!apiKey) return undefined;

    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}`
      );
      if (!res.ok) return undefined;

      const data = await res.json();
      const results = data.results;
      if (!results?.length || !results[0].poster_path) return undefined;

      return `https://image.tmdb.org/t/p/w500${results[0].poster_path}`;
    } catch {
      return undefined;
    }
  }

  async function handleRecommend() {
    const trimmed = movieName.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setRecommendations([]);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      setError("Backend URL is not configured. Add NEXT_PUBLIC_BACKEND_URL to .env.local");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${backendUrl}/recommend/${encodeURIComponent(trimmed)}`
      );

      if (!res.ok) {
        if (res.status === 0 || res.status >= 500) {
          throw new Error("Backend is not running or unreachable. Start your FastAPI server.");
        }
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid response format from backend.");
      }

      const titles: string[] = data
        .map((item: { title?: string }) => item?.title)
        .filter((t): t is string => Boolean(t));

      if (titles.length === 0) {
        setRecommendations([]);
        setLoading(false);
        return;
      }

      const withPosters: Recommendation[] = await Promise.all(
        titles.map(async (title) => ({
          title,
          posterUrl: await fetchPosterForMovie(title),
        }))
      );

      setRecommendations(withPosters);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch recommendations."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-red-600 sm:text-3xl">
            Movie Recommender
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Enter a movie name..."
            value={movieName}
            onChange={(e) => setMovieName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRecommend()}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-600/30 sm:max-w-md"
            disabled={loading}
          />
          <button
            onClick={handleRecommend}
            disabled={loading}
            className="shrink-0 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner />
                Recommending...
              </span>
            ) : (
              "Get Recommendations"
            )}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-8 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-400"
          >
            {error}
          </div>
        )}

        {recommendations.length > 0 && (
          <section>
            <h2 className="mb-6 text-xl font-semibold text-white/90">
              Recommendations
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {recommendations.map((rec) => (
                <div
                  key={rec.title}
                  className="group overflow-hidden rounded-lg bg-white/5 transition hover:bg-white/10"
                >
                  <div className="aspect-[2/3] w-full bg-white/5">
                    {rec.posterUrl ? (
                      <Image
                        src={rec.posterUrl}
                        alt={rec.title}
                        width={300}
                        height={450}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-neutral-800">
                        <span className="text-center text-xs text-white/50">
                          No poster
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="truncate p-2 text-sm font-medium text-white">
                    {rec.title}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && !error && recommendations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg text-white/60">
              Enter a movie name and click &quot;Get Recommendations&quot; to find similar films.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
