import { useState, useMemo, useCallback, useEffect } from 'react';

export interface FilterDefinition {
  key: string;
  label: string;
  options?: string[];
}

export interface UseFilteredPaginatedDataOptions {
  searchableFields: string[];
  filterDefinitions: FilterDefinition[];
  dateField?: string;
  defaultPageSize?: number;
}

export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface UseFilteredPaginatedDataReturn<T> {
  paginatedData: T[];
  totalFiltered: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  setPage: (page: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  resetFilters: () => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  activeFilterCount: number;
}

export function useFilteredPaginatedData<T extends Record<string, any>>(
  data: T[],
  options: UseFilteredPaginatedDataOptions
): UseFilteredPaginatedDataReturn<T> {
  const {
    searchableFields,
    filterDefinitions,
    dateField,
    defaultPageSize = 10,
  } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Reset to page 1 when filters, search, or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, dateRange, pageSize]);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters(prev => {
      if (value === 'all' || value === '') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
    setDateRange({ from: null, to: null });
  }, []);

  const filteredData = useMemo(() => {
    let result = data;

    // Step 1: Text search across searchable fields
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item =>
        searchableFields.some(field => {
          const value = item[field];
          if (value == null) return false;
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    // Step 2: Apply dropdown filters (AND-combined)
    for (const [key, value] of Object.entries(filters)) {
      result = result.filter(item => {
        const itemValue = item[key];
        if (itemValue == null) return false;
        return String(itemValue).toLowerCase() === value.toLowerCase();
      });
    }

    // Step 3: Apply date range filter
    if (dateField && (dateRange.from || dateRange.to)) {
      result = result.filter(item => {
        const dateValue = item[dateField];
        if (!dateValue) return false;
        const itemDate = new Date(dateValue).getTime();
        if (isNaN(itemDate)) return false;

        if (dateRange.from) {
          const fromDate = new Date(dateRange.from).getTime();
          if (itemDate < fromDate) return false;
        }
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (itemDate > toDate.getTime()) return false;
        }
        return true;
      });
    }

    return result;
  }, [data, searchQuery, filters, dateRange, searchableFields, dateField]);

  const totalFiltered = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  // Clamp current page if it exceeds total pages
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  const activeFilterCount = useMemo(() => {
    let count = Object.keys(filters).length;
    if (searchQuery.trim()) count++;
    if (dateRange.from || dateRange.to) count++;
    return count;
  }, [filters, searchQuery, dateRange]);

  const setPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
  }, []);

  return {
    paginatedData,
    totalFiltered,
    totalItems: data.length,
    currentPage: safePage,
    totalPages,
    setPage,
    searchQuery,
    setSearchQuery,
    filters,
    setFilter,
    resetFilters,
    dateRange,
    setDateRange,
    pageSize,
    setPageSize: handleSetPageSize,
    activeFilterCount,
  };
}
