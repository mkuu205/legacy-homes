'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Search, User, FileText, Ticket, Gauge } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('global');
  const [filterStatus, setFilterStatus] = useState('');
  const [results, setResults] = useState<any>({ residents: [], bills: [], tickets: [], meters: [] });
  const [isSearching, setIsSearching] = useState(false);

  const handleGlobalSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await api.get(`/api/audit-search-settings/search/global?query=${encodeURIComponent(searchQuery)}`);
      setResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdvancedSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      params.append('type', searchType);
      params.append('query', searchQuery);
      if (filterStatus) params.append('status', filterStatus);

      const response = await api.get(`/api/audit-search-settings/search/advanced?${params}`);
      setResults({ [searchType]: response.data });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advanced Search</h1>
        <p className="text-gray-600">Search across residents, bills, tickets, and meters</p>
      </div>

      {/* Search Tabs */}
      <Tabs value={searchType} onValueChange={setSearchType}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="global">Global Search</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Search</TabsTrigger>
        </TabsList>

        {/* Global Search */}
        <TabsContent value="global" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Search</CardTitle>
              <CardDescription>Search across all resources at once</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search residents, bills, tickets, meters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGlobalSearch()}
                  className="flex-1"
                />
                <Button onClick={handleGlobalSearch} disabled={isSearching} className="gap-2">
                  <Search className="w-4 h-4" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {Object.values(results).some((r: any) => Array.isArray(r) && r.length > 0) && (
            <div className="space-y-4">
              {/* Residents Results */}
              {results.residents && results.residents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Residents ({results.residents.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.residents.map((resident: any) => (
                        <div key={resident.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{resident.fullName}</p>
                            <p className="text-sm text-gray-600">{resident.email}</p>
                          </div>
                          <Badge variant="outline">{resident.registrationStatus}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bills Results */}
              {results.bills && results.bills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Bills ({results.bills.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.bills.map((bill: any) => (
                        <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{bill.billNumber}</p>
                            <p className="text-sm text-gray-600">{bill.resident.fullName} - {bill.house.houseNumber}</p>
                          </div>
                          <Badge variant="outline">{bill.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tickets Results */}
              {results.tickets && results.tickets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ticket className="w-5 h-5" />
                      Tickets ({results.tickets.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.tickets.map((ticket: any) => (
                        <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{ticket.subject}</p>
                            <p className="text-sm text-gray-600">{ticket.resident.fullName}</p>
                          </div>
                          <Badge variant="outline">{ticket.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Meters Results */}
              {results.meters && results.meters.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gauge className="w-5 h-5" />
                      Meters ({results.meters.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.meters.map((meter: any) => (
                        <div key={meter.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{meter.meterNumber}</p>
                            <p className="text-sm text-gray-600">{meter.house.houseNumber}</p>
                          </div>
                          <Badge variant="outline">{meter.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Advanced Search */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Search</CardTitle>
              <CardDescription>Search with filters for specific resource types</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resource type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residents">Residents</SelectItem>
                    <SelectItem value="bills">Bills</SelectItem>
                    <SelectItem value="tickets">Tickets</SelectItem>
                    <SelectItem value="meters">Meters</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Search query..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdvancedSearch()}
                />

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="UNPAID">Unpaid</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleAdvancedSearch} disabled={isSearching} className="w-full gap-2">
                <Search className="w-4 h-4" />
                Search
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {Object.values(results).some((r: any) => Array.isArray(r) && r.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(results).map(([key, items]: [string, any]) =>
                    Array.isArray(items) && items.length > 0
                      ? items.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{item.fullName || item.billNumber || item.subject || item.meterNumber}</p>
                              <p className="text-sm text-gray-600">{item.email || item.description || ''}</p>
                            </div>
                            <Badge variant="outline">{item.status || item.registrationStatus}</Badge>
                          </div>
                        ))
                      : null
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
