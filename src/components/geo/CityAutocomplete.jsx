import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { COLOMBIAN_CITIES } from '../../utils/colombianCities';

export const CityAutocomplete = ({
  value,
  onChange,
  placeholder = "Buscar ciudad...",
  required = false,
  disabled = false,
  className = "",
  label = "",
  error = "",
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filtrar ciudades localmente (sin llamadas a API)
  const filteredSuggestions = useMemo(() => {
    if (!value || value.length < 1) return [];
    const query = value.toLowerCase().trim();
    return COLOMBIAN_CITIES
      .filter(city => city.toLowerCase().includes(query))
      .slice(0, 10);
  }, [value]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    setHighlightedIndex(-1);
    if (newValue.length >= 1) {
      setIsOpen(true);
    } else {
      closeDropdown();
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          onChange(filteredSuggestions[highlightedIndex]);
          closeDropdown();
        }
        break;
      case 'Escape':
        closeDropdown();
        break;
      case 'Tab':
        closeDropdown();
        break;
    }
  };

  const handleSuggestionClick = (city) => {
    onChange(city);
    closeDropdown();
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (value.length >= 1 && filteredSuggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    setTimeout(closeDropdown, 200);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdown]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className={`
            w-full px-4 py-2.5 text-sm border rounded-xl transition-all
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}
            ${error ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}
          `}
        />
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}

      {isOpen && filteredSuggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {filteredSuggestions.map((city, index) => (
            <li
              key={city}
              onClick={() => handleSuggestionClick(city)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`
                px-4 py-2.5 text-sm cursor-pointer transition-colors
                ${index === highlightedIndex ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}
              `}
            >
              {city}
            </li>
          ))}
        </ul>
      )}

      {isOpen && filteredSuggestions.length === 0 && value.length >= 1 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-500 text-center">
          No se encontraron ciudades para "{value}"
        </div>
      )}
    </div>
  );
};

CityAutocomplete.displayName = 'CityAutocomplete';