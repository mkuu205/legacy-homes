'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle, Clock, User, Mail, Phone, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Resident {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  nationalId?: string;
  accountNumber: string;
  profilePicture?: string;
  registrationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  accountStatus: string;
  createdAt: string;
  assignedHouse?: {
    id: string;
    houseNumber: string;
  };
}

export default function ResidentsApprovalPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedHouseId, setSelectedHouseId] = useState('');
  const { toast } = useToast();

  // Fetch data based on active tab
  const { data: residents = [], isLoading, refetch } = useQuery({
    queryKey: ['residents', activeTab],
    queryFn: async () => {
      let endpoint = '/api/residents/applications/pending';
      if (activeTab === 'approved') endpoint = '/api/residents/applications/approved';
      if (activeTab === 'rejected') endpoint = '/api/residents/applications/rejected';
      const response = await api.get(endpoint);
      return response.data;
    },
  });

  const { data: counts = {} } = useQuery({
    queryKey: ['resident-counts'],
    queryFn: async () => {
      const response = await api.get('/api/residents/applications/counts');
      return response.data;
    },
  });

  const { data: houses = [] } = useQuery({
    queryKey: ['vacant-houses'],
    queryFn: async () => {
      const response = await api.get('/api/houses/vacant');
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (data: { residentId: string; assignedHouseId?: string }) =>
      api.post(`/api/residents/${data.residentId}/approve`, { assignedHouseId: data.assignedHouseId }),
    onSuccess: () => {
      toast({ title: 'Resident approved successfully' });
      setIsDialogOpen(false);
      setSelectedResident(null);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error, variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (data: { residentId: string; reason: string }) =>
      api.post(`/api/residents/${data.residentId}/reject`, { reason: data.reason }),
    onSuccess: () => {
      toast({ title: 'Resident rejected' });
      setIsDialogOpen(false);
      setSelectedResident(null);
      setRejectionReason('');
      refetch();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error, variant: 'destructive' });
    },
  });

  const assignHouseMutation = useMutation({
    mutationFn: (data: { residentId: string; houseId: string }) =>
      api.post(`/api/residents/${data.residentId}/assign-house`, { houseId: data.houseId }),
    onSuccess: () => {
      toast({ title: 'House assigned successfully' });
      setSelectedHouseId('');
      refetch();
    },
  });

  const handleApprove = () => {
    if (selectedResident) {
      approveMutation.mutate({
        residentId: selectedResident.id,
        assignedHouseId: selectedHouseId || undefined,
      });
    }
  };

  const handleReject = () => {
    if (selectedResident && rejectionReason) {
      rejectMutation.mutate({
        residentId: selectedResident.id,
        reason: rejectionReason,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resident Approvals</h1>
        <p className="text-gray-600">Manage resident registration applications and approvals</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{counts.pending || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{counts.approved || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{counts.rejected || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                Pending
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Approved
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2">
                <XCircle className="w-4 h-4" />
                Rejected
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-6">
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : residents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No residents found</div>
              ) : (
                <div className="space-y-3">
                  {residents.map((resident: Resident) => (
                    <div key={resident.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium">{resident.fullName}</p>
                            <div className="flex gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {resident.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {resident.phone}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {resident.assignedHouse && (
                          <Badge variant="outline">{resident.assignedHouse.houseNumber}</Badge>
                        )}
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedResident(resident);
                            setIsDialogOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resident Details</DialogTitle>
            <DialogDescription>Review and manage resident application</DialogDescription>
          </DialogHeader>

          {selectedResident && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <p className="text-gray-900">{selectedResident.fullName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-gray-900">{selectedResident.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <p className="text-gray-900">{selectedResident.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Account Number</label>
                  <p className="text-gray-900">{selectedResident.accountNumber}</p>
                </div>
                {selectedResident.nationalId && (
                  <div>
                    <label className="text-sm font-medium">National ID</label>
                    <p className="text-gray-900">{selectedResident.nationalId}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedResident.registrationStatus === 'PENDING' && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <label className="text-sm font-medium">Assign House (Optional)</label>
                    <Select value={selectedHouseId} onValueChange={setSelectedHouseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a house" />
                      </SelectTrigger>
                      <SelectContent>
                        {houses.map((house: any) => (
                          <SelectItem key={house.id} value={house.id}>
                            {house.houseNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleApprove}
                      disabled={approveMutation.isPending}
                      className="flex-1 gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (rejectionReason) handleReject();
                      }}
                      disabled={!rejectionReason || rejectMutation.isPending}
                      className="flex-1 gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>

                  <Textarea
                    placeholder="Rejection reason (if rejecting)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
