"use client";

import { SearchIcon, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, FormEvent } from "react";

interface SearchInputProps {
  autoFocus?: boolean;
}

export const SearchInput = ({ autoFocus }: SearchInputProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleClear = () => {
    setQuery("");
    router.push("/search");
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-[600px]">
      <div className="relative w-full">
        <input
          type="text"
          autoFocus={autoFocus}
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-4 py-2 pr-12 rounded-l-full border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder:text-white/60 focus:outline-hidden focus:border-[#5ADBFD] focus:ring-1 focus:ring-[#5ADBFD]"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-[#5ADBFD]"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <button
        type="submit"
        name="search video"
        aria-label="Search name video"
        className="px-5 py-2.5 bg-[#5ADBFD] border border-l-0 border-[#5ADBFD] rounded-r-full hover:bg-[#5ADBFD]/80 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <SearchIcon className="size-5" />
      </button>
    </form>
  );
};
