import React from 'react';
import { Search, X } from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  selectedDifficulty: string;
  setSelectedDifficulty: (difficulty: string) => void;
  selectedTopic: string;
  setSelectedTopic: (topic: string) => void;
  types: string[];
  difficulties: string[];
  topics: string[];
  resultsCount: number;
}

export default function FilterBar({
  searchQuery,
  setSearchQuery,
  selectedType,
  setSelectedType,
  selectedDifficulty,
  setSelectedDifficulty,
  selectedTopic,
  setSelectedTopic,
  types,
  difficulties,
  topics,
  resultsCount,
}: FilterBarProps) {
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedType('All');
    setSelectedDifficulty('All');
    setSelectedTopic('All');
  };

  const isFiltered = searchQuery !== '' || selectedType !== 'All' || selectedDifficulty !== 'All' || selectedTopic !== 'All';

  return (
    <div id="filter-bar-container" className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 md:p-6 mb-10">
      {/* Search and Main Filters Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Search input (5-cols) */}
        <div className="lg:col-span-5 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses, instructors, keywords..."
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-250 rounded-lg text-sm text-gray-950 placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-brand-blue focus:border-brand-blue focus:bg-white transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              id="clear-search-button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Course Type Filter (3-cols) */}
        <div className="lg:col-span-4 md:col-span-6">
          <div className="relative">
            <select
              id="type-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-250 rounded-lg text-xs md:text-sm text-gray-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-blue focus:bg-white cursor-pointer appearance-none shadow-2xs"
            >
              <option value="All">All Course Types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Difficulty Filter (3-cols) */}
        <div className="lg:col-span-3 md:col-span-6">
          <div className="relative">
            <select
              id="difficulty-select"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-250 rounded-lg text-xs md:text-sm text-gray-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-blue focus:bg-white cursor-pointer appearance-none shadow-2xs"
            >
              <option value="All">All Difficulties</option>
              {difficulties.map((diff) => (
                <option key={diff} value={diff}>
                  {diff}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Topics Quick Filter Pills Row */}
      <div id="topics-row" className="mt-5 pt-5 border-t border-gray-100">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-mono tracking-widest text-neutral-400 font-semibold uppercase">
            Filter by popular topics
          </span>
          <div className="flex flex-wrap gap-2 mt-1">
            <button
              id="topic-pill-all"
              onClick={() => setSelectedTopic('All')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-150 ${
                selectedTopic === 'All'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Topics
            </button>
            {topics.map((topic) => (
              <button
                key={topic}
                id={`topic-pill-${topic}`}
                onClick={() => setSelectedTopic(topic)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-150 ${
                  selectedTopic === topic
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'bg-gray-100 text-gray-650 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results and Clear Button */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-400 font-mono">
        <div id="results-count">
          Showing <span className="font-semibold text-gray-900">{resultsCount}</span> course{resultsCount !== 1 ? 's' : ''}
        </div>
        {isFiltered && (
          <button
            id="clear-all-filters"
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-brand-blue hover:text-brand-hover font-semibold transition-colors cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
