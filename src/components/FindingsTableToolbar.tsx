import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Search, X, FilterX, Calendar } from 'lucide-react';
import type { FilterDefinition, DateRange } from '../hooks/useFilteredPaginatedData';

interface FindingsTableToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onResetFilters: () => void;
  filterDefinitions: FilterDefinition[];
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  dateFieldLabel?: string;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalFiltered: number;
  totalItems: number;
  currentPage: number;
  activeFilterCount: number;
}

export function FindingsTableToolbar({
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  onResetFilters,
  filterDefinitions,
  dateRange,
  onDateRangeChange,
  dateFieldLabel = 'Date',
  pageSize,
  onPageSizeChange,
  totalFiltered,
  totalItems,
  currentPage,
  activeFilterCount,
}: FindingsTableToolbarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  // Sync external changes back to local state
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const startItem = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalFiltered);

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Filters + Page Size — full-width on small screens (no horizontal scroll) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {/* Search */}
        <div className="w-full min-w-0 flex-1 sm:min-w-[200px]">
          <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by resource, ID, description..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-9 bg-input border-border h-9"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filters */}
        {filterDefinitions.map((def) => (
          <div key={def.key} className="w-full min-w-0 sm:min-w-[140px] sm:w-auto">
            <Label className="text-xs text-muted-foreground mb-1 block">{def.label}</Label>
            <Select
              value={filters[def.key] || 'all'}
              onValueChange={(val) => onFilterChange(def.key, val)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {def.label}s</SelectItem>
                {def.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}

        {/* Date Range */}
        <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:min-w-[280px] sm:flex-1">
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateFieldLabel} From
            </Label>
            <Input
              type="date"
              value={dateRange.from || ''}
              onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value || null })}
              className="h-9 w-full bg-input border-border"
            />
          </div>
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateFieldLabel} To
            </Label>
            <Input
              type="date"
              value={dateRange.to || ''}
              onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value || null })}
              className="h-9 w-full bg-input border-border"
            />
          </div>
        </div>

        {/* Page Size */}
        <div className="w-full min-w-0 sm:w-auto sm:min-w-[100px]">
          <Label className="text-xs text-muted-foreground mb-1 block">Per page</Label>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Active filters + result count */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilterCount > 0 && (
            <>
              {searchQuery.trim() && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Search: &quot;{searchQuery}&quot;
                  <button onClick={() => onSearchChange('')} className="ml-0.5 hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {Object.entries(filters).map(([key, value]) => {
                const def = filterDefinitions.find(d => d.key === key);
                return (
                  <Badge key={key} variant="secondary" className="gap-1 text-xs">
                    {def?.label || key}: {value}
                    <button onClick={() => onFilterChange(key, 'all')} className="ml-0.5 hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
              {(dateRange.from || dateRange.to) && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {dateFieldLabel}: {dateRange.from || '...'} to {dateRange.to || '...'}
                  <button
                    onClick={() => onDateRangeChange({ from: null, to: null })}
                    className="ml-0.5 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <FilterX className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            </>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {totalFiltered === 0
            ? 'No findings match'
            : `Showing ${startItem}-${endItem} of ${totalFiltered} findings${totalFiltered !== totalItems ? ` (${totalItems} total)` : ''}`
          }
        </span>
      </div>
    </div>
  );
}
