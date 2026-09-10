import React, { useState, useMemo } from 'react';
import { Film, Play, Search, Star, Layers, X } from 'lucide-react';
import { Movie, StreamServer } from '../types';
import { DEFAULT_POSTER } from '../data/defaultData';

interface MoviesViewProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
}

export const MoviesView: React.FC<MoviesViewProps> = ({ movies, onSelectMovie }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSeriesModal, setActiveSeriesModal] = useState<Movie | null>(null);

  // Dynamically extract categories from available movies
  const categories = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => {
      if (m.category && m.category.trim()) {
        set.add(m.category.trim());
      }
    });
    return ['All', ...Array.from(set)];
  }, [movies]);

  // Filter movies based on category and search query
  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      const matchesCat =
        selectedCategory === 'All' ||
        m.category.toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.year && m.year.includes(q)) ||
        (m.language && m.language.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });
  }, [movies, selectedCategory, searchQuery]);

  const handlePlayMovieOrOpenEpisodes = (movie: Movie) => {
    if (movie.servers && movie.servers.length > 1) {
      setActiveSeriesModal(movie);
    } else {
      onSelectMovie(movie);
    }
  };

  const handleSelectEpisode = (movie: Movie, server: StreamServer) => {
    setActiveSeriesModal(null);
    onSelectMovie({
      ...movie,
      name: `${movie.name} - ${server.name}`,
      url: server.url,
      servers: movie.servers,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar & Header */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="সিনেমা বা সিরিজের নাম দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center text-xs text-slate-400">
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-sky-400 border border-blue-500/20 font-semibold">
            {filteredMovies.length} টি মুভি ও সিরিজ
          </span>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            {cat === 'All' ? 'সব মুভি ও সিরিজ' : cat}
          </button>
        ))}
      </div>

      {/* Movies Grid */}
      {filteredMovies.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
          <Film className="w-10 h-10 mx-auto mb-2 text-slate-500 opacity-50" />
          <p className="text-sm font-medium">কোনো সিনেমা পাওয়া যায়নি</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs text-sky-400 hover:underline"
            >
              সার্চ ফিল্টার রিসেট করুন
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredMovies.map((movie, idx) => {
            const hasMultipleEpisodes = movie.servers && movie.servers.length > 1;

            return (
              <div
                key={movie.id || idx}
                onClick={() => handlePlayMovieOrOpenEpisodes(movie)}
                className="group relative rounded-xl overflow-hidden bg-slate-900 border border-white/10 hover:border-blue-500/50 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col"
              >
                {/* Poster 2:3 Aspect ratio */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                  <img
                    src={movie.poster || DEFAULT_POSTER}
                    alt={movie.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>

                  {/* Hover Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/50 transform group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Category Pill Tag */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 backdrop-blur-md text-sky-400 border border-white/10 truncate max-w-[80%]">
                    {movie.category}
                  </span>

                  {/* Rating / Year Tag */}
                  {(movie.rating || movie.year) && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/90 text-slate-950 shadow-sm">
                      {movie.rating && (
                        <span className="flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-slate-950" />
                          {movie.rating}
                        </span>
                      )}
                      {movie.year && <span>{movie.year}</span>}
                    </div>
                  )}

                  {/* Multiple Episodes Badge */}
                  {hasMultipleEpisodes && (
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600/90 text-white shadow-md">
                      <Layers className="w-2.5 h-2.5" />
                      {movie.servers.length} পর্ব (Ep)
                    </span>
                  )}
                </div>

                {/* Title & Info */}
                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-sky-300 line-clamp-1 transition-colors">
                      {movie.name}
                    </h4>
                    {movie.description && (
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {movie.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 border-t border-white/5 pt-1.5">
                    <span>{movie.language || 'HD Stream'}</span>
                    <span className="text-blue-400 font-semibold flex items-center gap-0.5">
                      {hasMultipleEpisodes ? 'পর্ব নির্বাচন' : 'প্লে করুন'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Episode Picker Modal for Multi-Episode Series */}
      {activeSeriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0e1628] border border-white/10 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={activeSeriesModal.poster || DEFAULT_POSTER}
                  alt={activeSeriesModal.name}
                  className="w-10 h-14 rounded-md object-cover border border-white/10"
                />
                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-1">
                    {activeSeriesModal.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeSeriesModal.category} • {activeSeriesModal.servers.length} টি পর্ব / সার্ভার
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSeriesModal(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Episodes List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              <p className="text-xs font-semibold text-slate-300 mb-2">
                যে পর্বটি দেখতে চান নির্বাচন করুন:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeSeriesModal.servers.map((srv, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => handleSelectEpisode(activeSeriesModal, srv)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-blue-600/30 border border-white/10 hover:border-blue-500/50 text-left transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                      {srv.name}
                    </span>
                    <Play className="w-3.5 h-3.5 text-blue-400 group-hover:text-white shrink-0 ml-1.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-white/5 border-t border-white/10 flex justify-end">
              <button
                onClick={() => {
                  onSelectMovie(activeSeriesModal);
                  setActiveSeriesModal(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                ১ম পর্ব চালু করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
