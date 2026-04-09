'use client';

import { useState } from 'react';
import RequestFilters from '@/components/request-list/RequestFilters';
import RequestListTable from '@/components/request-list/RequestListTable';
import { MOCK_REQUESTS } from '@/lib/mock-request-list-data';
import type { RequestListItem } from '@/lib/types';

export default function RequestListPage() {
  const [filters, setFilters] = useState({});
  // In a real implementation, you would fetch and filter data based on `filters`
  const [filteredData, setFilteredData] = useState<RequestListItem[]>(MOCK_REQUESTS);

  const handleSearch = (newFilters: any) => {
    // Placeholder for search logic
    console.log('Searching with filters:', newFilters);
  };

  const handleClear = () => {
    setFilters({});
    // Reset to initial data or perform a fresh fetch
    setFilteredData(MOCK_REQUESTS);
  };
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Request List</h1>
        <p className="text-sm text-muted-foreground">Home / Request List</p>
      </div>
      <RequestFilters onSearch={handleSearch} onClear={handleClear} />
      <RequestListTable data={filteredData} />
    </div>
  );
}
