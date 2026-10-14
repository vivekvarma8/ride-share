import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, GraduationCap, Compass, Train, Building2, Check } from 'lucide-react';
import { searchLocations, LocationItem } from '../services/location.service';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, coords?: [number, number]) => void;
  placeholder?: string;
  label?: string;
  iconColor?: string;
  required?: boolean;
  className?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Search place, landmark, or campus...',
  label,
  iconColor = 'text-indigo-600',
  required = false,
  className = '',
}) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<LocationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  const fetchSuggestions = (searchTerm: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchLocations(searchTerm);
        setSuggestions(results);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 180);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setIsOpen(true);
    fetchSuggestions(val);
  };

  const handleFocus = () => {
    setIsOpen(true);
    fetchSuggestions(query);
  };

  const handleSelect = (item: LocationItem) => {
    setQuery(item.name);
    onChange(item.name, item.coords);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'college':
        return <GraduationCap className="h-4 w-4 text-purple-600 shrink-0" />;
      case 'transit':
        return <Train className="h-4 w-4 text-emerald-600 shrink-0" />;
      case 'junction':
        return <Compass className="h-4 w-4 text-amber-600 shrink-0" />;
      case 'tech_park':
        return <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />;
      default:
        return <MapPin className="h-4 w-4 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        <MapPin className={`h-4 w-4 absolute left-3.5 top-3 ${iconColor} pointer-events-none`} />
        
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition shadow-2xs"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onChange('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Google Maps-style Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Locations & Stops</span>
            {isLoading && <span className="text-indigo-600 font-semibold animate-pulse">Searching maps...</span>}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {suggestions.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                {isLoading ? 'Fetching locations...' : 'No matching locations found'}
              </div>
            ) : (
              suggestions.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full px-3.5 py-2.5 flex items-start gap-3 text-left transition ${
                      isSelected ? 'bg-indigo-50/80 text-indigo-950' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100/80">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate text-slate-900">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.secondary}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
