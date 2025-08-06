
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Search, Edit, Trash2, Package, Wrench } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { CatalogItem, CreateCatalogItemInput, UpdateCatalogItemInput, ItemType } from '../../../server/src/schema';

interface CatalogManagerProps {
  catalogItems: CatalogItem[];
  onUpdate: () => void;
}

export function CatalogManager({ catalogItems, onUpdate }: CatalogManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ItemType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<CreateCatalogItemInput>({
    code: '',
    name: '',
    type: 'item',
    unit_price: 0,
    description: null
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      type: 'item',
      unit_price: 0,
      description: null
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingItem) {
        // Update existing item
        const updateData: UpdateCatalogItemInput = {
          id: editingItem.id,
          ...formData
        };
        await trpc.updateCatalogItem.mutate(updateData);
        setEditingItem(null);
      } else {
        // Create new item
        await trpc.createCatalogItem.mutate(formData);
        setShowAddDialog(false);
      }

      resetForm();
      onUpdate();
    } catch (error) {
      console.error('Failed to save catalog item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteCatalogItem.mutate(id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete catalog item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      type: item.type,
      unit_price: item.unit_price,
      description: item.description
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    resetForm();
  };

  const filteredItems = catalogItems.filter((item: CatalogItem) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const ItemForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Item Code *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateCatalogItemInput) => ({ ...prev, code: e.target.value }))
            }
            placeholder="ITM001"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type *</Label>
          <Select 
            value={formData.type || 'item'} 
            onValueChange={(value: ItemType) =>
              setFormData((prev: CreateCatalogItemInput) => ({ ...prev, type: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="item">📦 Item</SelectItem>
              <SelectItem value="service">🔧 Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateCatalogItemInput) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Enter item/service name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="unit_price">Unit Price *</Label>
        <Input
          id="unit_price"
          type="number"
          value={formData.unit_price}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateCatalogItemInput) => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))
          }
          placeholder="0"
          step="0.01"
          min="0"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateCatalogItemInput) => ({ 
              ...prev, 
              description: e.target.value || null 
            }))
          }
          placeholder="Optional description"
          rows={3}
        />
      </div>

      <div className="flex space-x-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Saving...' : (editingItem ? '💾 Update' : '➕ Add Item')}
        </Button>
        {editingItem && (
          <Button type="button" variant="outline" onClick={cancelEdit}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search catalog items..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={typeFilter} onValueChange={(value: ItemType | 'all') => setTypeFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="item">📦 Items</SelectItem>
            <SelectItem value="service">🔧 Services</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Catalog Item</DialogTitle>
              <DialogDescription>
                Add a new item or service to your catalog
              </DialogDescription>
            </DialogHeader>
            <ItemForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              {catalogItems.length === 0 
                ? "No catalog items yet. Add your first item or service!" 
                : "No items match your search criteria."}
            </p>
            {catalogItems.length === 0 && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item: CatalogItem) => (
            <Card key={item.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {item.type === 'item' ? (
                      <Package className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Wrench className="h-5 w-5 text-purple-600" />
                    )}
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <p className="text-sm text-gray-500">Code: {item.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={item.type === 'item' ? 'default' : 'secondary'}>
                      {item.type === 'item' ? '📦 Item' : '🔧 Service'}
                    </Badge>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(item)}
                        disabled={isLoading}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Catalog Item</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{item.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      Rp {item.unit_price.toLocaleString('id-ID')}
                    </p>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    Added: {item.created_at.toLocaleDateString()}
                  </div>
                </div>
              </CardContent>

              {/* Inline Edit Form */}
              {editingItem?.id === item.id && (
                <CardContent className="border-t bg-gray-50">
                  <ItemForm />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
