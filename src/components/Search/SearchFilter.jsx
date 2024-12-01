import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Search, Filter } from 'lucide-react';

export const SearchFilter = ({ onSearch, onFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    amount: 'all'
  });

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search projects, clients, or transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </form>

      <div className="flex gap-4">
        <Select
          value={filters.status}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.dateRange}
          onValueChange={(value) => handleFilterChange('dateRange', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.amount}
          onValueChange={(value) => handleFilterChange('amount', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Amount Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Amounts</SelectItem>
            <SelectItem value="0-1">0-1 ETH</SelectItem>
            <SelectItem value="1-5">1-5 ETH</SelectItem>
            <SelectItem value="5-10">5-10 ETH</SelectItem>
            <SelectItem value="10+">10+ ETH</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default SearchFilter; 