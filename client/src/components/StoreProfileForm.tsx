
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { StoreProfile, CreateStoreProfileInput, UpdateStoreProfileInput } from '../../../server/src/schema';

interface StoreProfileFormProps {
  initialData: StoreProfile | null;
  onUpdate: (profile: StoreProfile) => void;
}

export function StoreProfileForm({ initialData, onUpdate }: StoreProfileFormProps) {
  const [formData, setFormData] = useState<CreateStoreProfileInput>({
    name: '',
    address: '',
    phone: '',
    email: '',
    npwp: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        address: initialData.address,
        phone: initialData.phone,
        email: initialData.email,
        npwp: initialData.npwp
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      let result: StoreProfile;

      if (initialData) {
        // Update existing profile
        const updateData: UpdateStoreProfileInput = {
          id: initialData.id,
          ...formData
        };
        result = await trpc.updateStoreProfile.mutate(updateData);
        setMessage({ type: 'success', text: 'Store profile updated successfully! ✨' });
      } else {
        // Create new profile
        result = await trpc.createStoreProfile.mutate(formData);
        setMessage({ type: 'success', text: 'Store profile created successfully! 🎉' });
      }

      onUpdate(result);
    } catch (error) {
      console.error('Failed to save store profile:', error);
      setMessage({ type: 'error', text: 'Failed to save store profile. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateStoreProfileInput, value: string) => {
    setFormData((prev: CreateStoreProfileInput) => ({
      ...prev,
      [field]: value
    }));
    // Clear message when user starts typing
    if (message) setMessage(null);
  };

  return (
    <div className="space-y-6">
      {!initialData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <p className="text-blue-800">
              Set up your store profile to get started with transaction management.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Store Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange('name', e.target.value)
              }
              placeholder="Enter your store name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange('email', e.target.value)
              }
              placeholder="store@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange('phone', e.target.value)
              }
              placeholder="+62 xxx-xxxx-xxxx"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="npwp">NPWP *</Label>
            <Input
              id="npwp"
              value={formData.npwp}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange('npwp', e.target.value)
              }
              placeholder="xx.xxx.xxx.x-xxx.xxx"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Store Address *</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleInputChange('address', e.target.value)
            }
            placeholder="Complete store address"
            required
          />
        </div>

        {message && (
          <div className={`p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <p>{message.text}</p>
            </div>
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </div>
          ) : (
            <span>
              {initialData ? '💾 Update Store Profile' : '🏪 Create Store Profile'}
            </span>
          )}
        </Button>
      </form>

      {initialData && (
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-sm">Profile Information</CardTitle>
            <CardDescription className="text-xs">
              Last updated: {initialData.updated_at.toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><strong>Created:</strong> {initialData.created_at.toLocaleDateString()}</p>
            <p><strong>Profile ID:</strong> {initialData.id}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
