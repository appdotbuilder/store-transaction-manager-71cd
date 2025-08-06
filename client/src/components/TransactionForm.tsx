
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Calculator, Receipt } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { CatalogItem, CreateTransactionInput } from '../../../server/src/schema';

interface TransactionFormProps {
  catalogItems: CatalogItem[];
  onSuccess: () => void;
}

interface TransactionItemInput {
  catalog_item_id: number;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
}

export function TransactionForm({ catalogItems, onSuccess }: TransactionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<TransactionItemInput[]>([]);
  
  const [formData, setFormData] = useState<Omit<CreateTransactionInput, 'items'>>({
    customer_name: '',
    customer_address: null,
    customer_phone: null,
    customer_email: null,
    ppn_enabled: true,
    regional_tax_enabled: false,
    pph22_enabled: false,
    pph23_enabled: false,
    notes: null,
    transaction_date: new Date()
  });

  const addItem = () => {
    setItems((prev: TransactionItemInput[]) => [
      ...prev,
      {
        catalog_item_id: 0,
        quantity: 1,
        unit_price: 0,
        discount_percentage: 0
      }
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev: TransactionItemInput[]) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TransactionItemInput, value: number) => {
    setItems((prev: TransactionItemInput[]) => 
      prev.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const updateItemFromCatalog = (index: number, catalogItemId: number) => {
    const catalogItem = catalogItems.find(item => item.id === catalogItemId);
    if (catalogItem) {
      updateItem(index, 'catalog_item_id', catalogItemId);
      updateItem(index, 'unit_price', catalogItem.unit_price);
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((total, item) => {
      const lineTotal = item.quantity * item.unit_price;
      const discountAmount = lineTotal * (item.discount_percentage / 100);
      return total + (lineTotal - discountAmount);
    }, 0);
  };

  const calculateTaxes = () => {
    const subtotal = calculateSubtotal();
    const ppn = formData.ppn_enabled ? subtotal * 0.11 : 0;
    const regionalTax = formData.regional_tax_enabled ? subtotal * 0.10 : 0;
    const pph22 = formData.pph22_enabled ? subtotal * 0.015 : 0;
    const pph23 = formData.pph23_enabled ? subtotal * 0.02 : 0;
    
    return { ppn, regionalTax, pph22, pph23 };
  };

  const calculateStampDuty = () => {
    const total = calculateSubtotal();
    const taxes = calculateTaxes();
    const grandTotal = total + taxes.ppn + taxes.regionalTax + taxes.pph22 + taxes.pph23;
    return grandTotal >= 5000000 ? 10000 : 0; // Rp 10,000 stamp duty for transactions >= Rp 5,000,000
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxes = calculateTaxes();
    const stampDuty = calculateStampDuty();
    return subtotal + taxes.ppn + taxes.regionalTax + taxes.pph22 + taxes.pph23 + stampDuty;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      alert('Please add at least one item to the transaction.');
      return;
    }

    const invalidItems = items.filter(item => 
      item.catalog_item_id === 0 || item.quantity <= 0 || item.unit_price <= 0
    );
    
    if (invalidItems.length > 0) {
      alert('Please fill in all item details correctly.');
      return;
    }

    setIsLoading(true);

    try {
      const transactionData: CreateTransactionInput = {
        ...formData,
        items: items
      };

      await trpc.createTransaction.mutate(transactionData);
      
      // Reset form
      setFormData({
        customer_name: '',
        customer_address: null,
        customer_phone: null,
        customer_email: null,
        ppn_enabled: true,
        regional_tax_enabled: false,
        pph22_enabled: false,
        pph23_enabled: false,
        notes: null,
        transaction_date: new Date()
      });
      setItems([]);
      
      onSuccess();
      alert('Transaction created successfully! 🎉');
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert('Failed to create transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const taxes = calculateTaxes();
  const subtotal = calculateSubtotal();
  const stampDuty = calculateStampDuty();
  const total = calculateTotal();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            👤 Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, customer_name: e.target.value }))
                }
                placeholder="Enter customer name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_email">Email</Label>
              <Input
                id="customer_email"
                type="email"
                value={formData.customer_email || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, customer_email: e.target.value || null }))
                }
                placeholder="customer@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_phone">Phone</Label>
              <Input
                id="customer_phone"
                value={formData.customer_phone || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, customer_phone: e.target.value || null }))
                }
                placeholder="+62 xxx-xxxx-xxxx"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_date">Transaction Date</Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date?.toISOString().split('T')[0] || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, transaction_date: new Date(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_address">Address</Label>
            <Textarea
              id="customer_address"
              value={formData.customer_address || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev) => ({ ...prev, customer_address: e.target.value || null }))
              }
              placeholder="Customer address"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              📦 Transaction Items
            </CardTitle>
            <Button type="button" onClick={addItem} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No items added yet. Click "Add Item" to start.</p>
            </div>
          ) : (
            items.map((item, index) => {
              const catalogItem = catalogItems.find(ci => ci.id === item.catalog_item_id);
              const lineTotal = item.quantity * item.unit_price;
              const discountAmount = lineTotal * (item.discount_percentage / 100);
              const finalLineTotal = lineTotal - discountAmount;

              return (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-2">
                        <Label>Item/Service *</Label>
                        <Select
                          value={item.catalog_item_id.toString()}
                          onValueChange={(value) => updateItemFromCatalog(index, parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item..." />
                          </SelectTrigger>
                          <SelectContent>
                            {catalogItems.map((catalogItem) => (
                              <SelectItem key={catalogItem.id} value={catalogItem.id.toString()}>
                                <div className="flex items-center space-x-2">
                                  <Badge variant={catalogItem.type === 'item' ? 'default' : 'secondary'}>
                                    {catalogItem.type === 'item' ? '📦' : '🔧'}
                                  </Badge>
                                  <span>{catalogItem.name}</span>
                                  <span className="text-xs text-gray-500">
                                    (Rp {catalogItem.unit_price.toLocaleString('id-ID')})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          min="0.01"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <Label>Unit Price *</Label>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                          }
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <Label>Discount %</Label>
                        <Input
                          type="number"
                          value={item.discount_percentage}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateItem(index, 'discount_percentage', parseFloat(e.target.value) || 0)
                          }
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>

                      <div className="flex flex-col justify-between">
                        <Label>Line Total</Label>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-green-600">
                            Rp {finalLineTotal.toLocaleString('id-ID')}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {catalogItem && (
                      <div className="mt-2 text-xs text-gray-600">
                        <p>Code: {catalogItem.code}</p>
                        {catalogItem.description && <p>Description: {catalogItem.description}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Tax Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            💰 Tax Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>PPN (11%)</Label>
                <p className="text-xs text-gray-600">Value Added Tax</p>
              </div>
              <Switch
                checked={formData.ppn_enabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, ppn_enabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Regional Tax (10%)</Label>
                <p className="text-xs text-gray-600">Local government tax</p>
              </div>
              <Switch
                checked={formData.regional_tax_enabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, regional_tax_enabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>PPh Pasal 22 (1.5%)</Label>
                <p className="text-xs text-gray-600">Income tax article 22</p>
              </div>
              <Switch
                checked={formData.pph22_enabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, pph22_enabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>PPh Pasal 23 (2%)</Label>
                <p className="text-xs text-gray-600">Income tax article 23</p>
              </div>
              <Switch
                checked={formData.pph23_enabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, pph23_enabled: checked }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Summary */}
      {items.length > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              💸 Transaction Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-lg">
              <span>Subtotal:</span>
              <span className="font-semibold">Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>

            {formData.ppn_enabled && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>PPN (11%):</span>
                <span>Rp {taxes.ppn.toLocaleString('id-ID')}</span>
              </div>
            )}

            {formData.regional_tax_enabled && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Regional Tax (10%):</span>
                <span>Rp {taxes.regionalTax.toLocaleString('id-ID')}</span>
              </div>
            )}

            {formData.pph22_enabled && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>PPh Pasal 22 (1.5%):</span>
                <span>Rp {taxes.pph22.toLocaleString('id-ID')}</span>
              </div>
            )}

            {formData.pph23_enabled && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>PPh Pasal 23 (2%):</span>
                <span>Rp {taxes.pph23.toLocaleString('id-ID')}</span>
              </div>
            )}

            {stampDuty > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Stamp Duty:</span>
                <span>Rp {stampDuty.toLocaleString('id-ID')}</span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between text-xl font-bold text-green-600">
              <span>Total Amount:</span>
              <span>Rp {total.toLocaleString('id-ID')}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value || null }))
            }
            placeholder="Any additional notes for this transaction..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            type="submit"
            disabled={isLoading || items.length === 0}
            className="w-full text-lg py-6"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Creating Transaction...</span>
              </div>
            ) : (
              <span>🧾 Create Transaction - Rp {total.toLocaleString('id-ID')}</span>
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
