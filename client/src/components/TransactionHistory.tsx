
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Eye, Trash2, Receipt } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Transaction, TransactionStatus } from '../../../server/src/schema';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onUpdate: () => void;
}

export function TransactionHistory({ transactions, onUpdate }: TransactionHistoryProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);

  const filteredTransactions = transactions.filter((transaction: Transaction) => 
    statusFilter === 'all' || transaction.status === statusFilter
  );

  const handleStatusChange = async (transactionId: number, newStatus: TransactionStatus) => {
    setIsLoading(true);
    try {
      await trpc.updateTransaction.mutate({
        id: transactionId,
        status: newStatus
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to update transaction status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (transactionId: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteTransaction.mutate(transactionId);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: TransactionStatus) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'paid':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusEmoji = (status: TransactionStatus) => {
    switch (status) {
      case 'confirmed':
        return '✅';
      case 'paid':
        return '💰';
      case 'draft':
        return '📝';
      case 'cancelled':
        return '❌';
      default:
        return '❓';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <Select value={statusFilter} onValueChange={(value: TransactionStatus | 'all') => setStatusFilter(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">📝 Draft</SelectItem>
            <SelectItem value="confirmed">✅ Confirmed</SelectItem>
            <SelectItem value="paid">💰 Paid</SelectItem>
            <SelectItem value="cancelled">❌ Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {transactions.length === 0 
                ? "No transactions recorded yet." 
                : "No transactions match the selected filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTransactions.map((transaction: Transaction) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-blue-600" />
                      {transaction.transaction_number}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {transaction.customer_name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusBadgeVariant(transaction.status)}>
                      {getStatusEmoji(transaction.status)} {transaction.status.toUpperCase()}
                    </Badge>
                    <div className="flex space-x-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedTransaction(transaction)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Receipt className="h-5 w-5" />
                              Transaction Details - {selectedTransaction?.transaction_number}
                            </DialogTitle>
                            <DialogDescription>
                              Complete transaction information and summary
                            </DialogDescription>
                          </DialogHeader>
                          {selectedTransaction && (
                            <div className="space-y-4">
                              {/* Customer Info */}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <strong>Customer:</strong> {selectedTransaction.customer_name}
                                </div>
                                <div>
                                  <strong>Date:</strong> {selectedTransaction.transaction_date.toLocaleDateString()}
                                </div>
                                {selectedTransaction.customer_phone && (
                                  <div>
                                    <strong>Phone:</strong> {selectedTransaction.customer_phone}
                                  </div>
                                )}
                                {selectedTransaction.customer_email && (
                                  <div>
                                    <strong>Email:</strong> {selectedTransaction.customer_email}
                                  </div>
                                )}
                              </div>

                              {selectedTransaction.customer_address && (
                                <div className="text-sm">
                                  <strong>Address:</strong> {selectedTransaction.customer_address}
                                </div>
                              )}

                              {/* Financial Summary */}
                              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Subtotal:</span>
                                  <span>Rp {selectedTransaction.subtotal.toLocaleString('id-ID')}</span>
                                </div>
                                {selectedTransaction.ppn_enabled && (
                                  <div className="flex justify-between text-gray-600">
                                    <span>PPN:</span>
                                    <span>Rp {selectedTransaction.ppn_amount.toLocaleString('id-ID')}</span>
                                  </div>
                                )}
                                {selectedTransaction.regional_tax_enabled && (
                                  <div className="flex justify-between text-gray-600">
                                    <span>Regional Tax:</span>
                                    <span>Rp {selectedTransaction.regional_tax_amount.toLocaleString('id-ID')}</span>
                                  </div>
                                )}
                                {selectedTransaction.pph22_enabled && (
                                  <div className="flex justify-between text-gray-600">
                                    <span>PPh 22:</span>
                                    <span>Rp {selectedTransaction.pph22_amount.toLocaleString('id-ID')}</span>
                                  </div>
                                )}
                                {selectedTransaction.pph23_enabled && (
                                  <div className="flex justify-between text-gray-600">
                                    <span>PPh 23:</span>
                                    <span>Rp {selectedTransaction.pph23_amount.toLocaleString('id-ID')}</span>
                                  </div>
                                )}
                                {selectedTransaction.stamp_duty_required && (
                                  <div className="flex justify-between text-gray-600">
                                    <span>Stamp Duty:</span>
                                    <span>Rp {selectedTransaction.stamp_duty_amount.toLocaleString('id-ID')}</span>
                                  </div>
                                )}
                                <hr />
                                <div className="flex justify-between font-bold text-lg text-green-600">
                                  <span>Total:</span>
                                  <span>Rp {selectedTransaction.total_amount.toLocaleString('id-ID')}</span>
                                </div>
                              </div>

                              {selectedTransaction.notes && (
                                <div className="text-sm">
                                  <strong>Notes:</strong> {selectedTransaction.notes}
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      {/* Status Change Dropdown */}
                      <Select
                        value={transaction.status}
                        onValueChange={(value: TransactionStatus) => 
                          handleStatusChange(transaction.id, value)
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">📝 Draft</SelectItem>
                          <SelectItem value="confirmed">✅ Confirmed</SelectItem>
                          <SelectItem value="paid">💰 Paid</SelectItem>
                          <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                        </SelectContent>
                      </Select>

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
                            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete transaction "{transaction.transaction_number}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(transaction.id)}>
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
                      Rp {transaction.total_amount.toLocaleString('id-ID')}
                    </p>
                    <p className="text-sm text-gray-600">
                      Date: {transaction.transaction_date.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>Created: {transaction.created_at.toLocaleDateString()}</p>
                    <p>Updated: {transaction.updated_at.toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
