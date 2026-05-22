'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Plus, Edit2, Lock, Unlock, Trash2, Home } from 'lucide-react';

interface House {
  id: string;
  houseNumber: string;
  occupancyStatus: 'OCCUPIED' | 'VACANT' | 'UNDER_CONSTRUCTION' | 'SUSPENDED' | 'MAINTENANCE';
  isLocked: boolean;
  notes?: string;
  resident?: {
    id: string;
    fullName: string;
    email: string;
  };
  meter?: {
    id: string;
    meterNumber: string;
    status: string;
  };
  createdAt: string;
}

export default function HousesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newHouse, setNewHouse] = useState({ houseNumber: '', occupancyStatus: 'UNDER_CONSTRUCTION', notes: '' });
  const { toast } = useToast();

  const { data: houses = [], isLoading, refetch } = useQuery({
    queryKey: ['houses', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('occupancyStatus', statusFilter);
      const response = await api.get(`/api/houses?${params}`);
      return response.data;
    },
  });

  const createHouseMutation = useMutation({
    mutationFn: (data) => api.post('/api/houses', data),
    onSuccess: () => {
      toast({ title: 'House created successfully' });
      setIsCreateDialogOpen(false);
      setNewHouse({ houseNumber: '', occupancyStatus: 'UNDER_CONSTRUCTION', notes: '' });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to create house', variant: 'destructive' });
    },
  });

  const lockHouseMutation = useMutation({
    mutationFn: (houseId: string) => api.post(`/api/houses/${houseId}/lock`, {}),
    onSuccess: () => {
      toast({ title: 'House locked for billing' });
      refetch();
    },
  });

  const unlockHouseMutation = useMutation({
    mutationFn: (houseId: string) => api.post(`/api/houses/${houseId}/unlock`, {}),
    onSuccess: () => {
      toast({ title: 'House unlocked' });
      refetch();
    },
  });

  const deleteHouseMutation = useMutation({
    mutationFn: (houseId: string) => api.delete(`/api/houses/${houseId}`),
    onSuccess: () => {
      toast({ title: 'House deleted successfully' });
      refetch();
    },
  });

  const filteredHouses = houses.filter((house: House) =>
    house.houseNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OCCUPIED':
        return 'bg-green-100 text-green-800';
      case 'VACANT':
        return 'bg-yellow-100 text-yellow-800';
      case 'UNDER_CONSTRUCTION':
        return 'bg-blue-100 text-blue-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      case 'MAINTENANCE':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Houses</h1>
          <p className="text-gray-600">Manage all estate houses and their assignments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add House
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New House</DialogTitle>
              <DialogDescription>Add a new house to the estate</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">House Number</label>
                <Input
                  value={newHouse.houseNumber}
                  onChange={(e) => setNewHouse({ ...newHouse, houseNumber: e.target.value })}
                  placeholder="e.g., A-101"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={newHouse.occupancyStatus} onValueChange={(value) => setNewHouse({ ...newHouse, occupancyStatus: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNDER_CONSTRUCTION">Under Construction</SelectItem>
                    <SelectItem value="VACANT">Vacant</SelectItem>
                    <SelectItem value="OCCUPIED">Occupied</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Input
                  value={newHouse.notes}
                  onChange={(e) => setNewHouse({ ...newHouse, notes: e.target.value })}
                  placeholder="Additional notes"
                />
              </div>
              <Button
                onClick={() => createHouseMutation.mutate(newHouse as any)}
                disabled={!newHouse.houseNumber || createHouseMutation.isPending}
                className="w-full"
              >
                Create House
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search by house number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="OCCUPIED">Occupied</SelectItem>
            <SelectItem value="VACANT">Vacant</SelectItem>
            <SelectItem value="UNDER_CONSTRUCTION">Under Construction</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Houses Grid */}
      {isLoading ? (
        <div className="text-center py-12">Loading houses...</div>
      ) : filteredHouses.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
            No houses found
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredHouses.map((house: House) => (
            <Card key={house.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      {house.houseNumber}
                    </CardTitle>
                    <Badge className={`mt-2 ${getStatusColor(house.occupancyStatus)}`}>
                      {house.occupancyStatus.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {house.isLocked && <Badge variant="destructive">Locked</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {house.resident && (
                  <div className="text-sm">
                    <p className="font-medium">Resident</p>
                    <p className="text-gray-600">{house.resident.fullName}</p>
                    <p className="text-xs text-gray-500">{house.resident.email}</p>
                  </div>
                )}
                {house.meter && (
                  <div className="text-sm">
                    <p className="font-medium">Meter</p>
                    <p className="text-gray-600">{house.meter.meterNumber}</p>
                  </div>
                )}
                {house.notes && (
                  <div className="text-sm">
                    <p className="font-medium">Notes</p>
                    <p className="text-gray-600">{house.notes}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-3">
                  {house.isLocked ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unlockHouseMutation.mutate(house.id)}
                      disabled={unlockHouseMutation.isPending}
                      className="flex-1 gap-1"
                    >
                      <Unlock className="w-4 h-4" />
                      Unlock
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => lockHouseMutation.mutate(house.id)}
                      disabled={lockHouseMutation.isPending}
                      className="flex-1 gap-1"
                    >
                      <Lock className="w-4 h-4" />
                      Lock
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteHouseMutation.mutate(house.id)}
                    disabled={deleteHouseMutation.isPending}
                    className="gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
