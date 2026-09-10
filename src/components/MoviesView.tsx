import React, { useState } from 'react';
import { Film, Play } from 'lucide-react';
import { Movie } from '../types';
import { DEFAULT_POSTER } from '../data/defaultData';

interface MoviesViewProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
}

export const MoviesView: React.FC<MoviesViewProps> = ({ movies, onSelectMovie }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Bangla', 'Hindi', 'Hollywood', 'Bollywood'];

  const filteredMovies = movies.filter((m) => {
    return selectedCategory === 'All' || m.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="space-y-4">
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
            {cat === 'All' ? 'সব সিনেমা (All)' : cat}
          </button>
        ))}
      </div>

      {/* Movies Grid */}
      {filteredMovies.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
          <Film className="w-10 h-10 mx-auto mb-2 text-slate-500 opacity-50" />
          <p className="text-sm font-medium">কোনো সিনেমা পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredMovies.map((movie, idx) => (
            <div
              key={movie.id || idx}
              onClick={() => onSelectMovie(movie)}
              className="group relative rounded-xl overflow-hidden bg-slate-900 border border-white/10 hover:border-blue-500/50 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col"
            >
              {/* Poster 2:3 Aspect ratio */}
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                <img
                  src={movie.poster || DEFAULT_POSTER}
                  alt={movie.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>

                {/* Hover Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/50 transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Category Pill Tag */}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 backdrop-blur-md text-sky-400 border border-white/10">
                  {movie.category}
                </span>
              </div>

              {/* Title & Info */}
              <div className="p-2.5 flex-1 flex flex-col justify-between">
                <h4 className="text-xs font-bold text-white group-hover:text-sky-300 line-clamp-1 transition-colors">
                  {movie.name}
                </h4>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>HD Stream</span>
                  <span className="text-blue-400 font-semibold flex items-center gap-0.5">
                    প্লে করুন
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
