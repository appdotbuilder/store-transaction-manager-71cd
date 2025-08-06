
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, Receipt, FileX, Printer } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Transaction, DocumentType, GenerateDocumentInput, Document } from '../../../server/src/schema';

interface DocumentGeneratorProps {
  transactions: Transaction[];
}

export function DocumentGenerator({ transactions }: DocumentGeneratorProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<number | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedDocuments, setGeneratedDocuments] = useState<Document[]>([]);

  const eligibleTransactions = transactions.filter((t: Transaction) => 
    t.status === 'confirmed' || t.status === 'paid'
  );

  const documentTypes = [
    { value: 'sales_note', label: '📋 Sales Note', description: 'Simple sales record' },
    { value: 'payment_receipt', label: '💳 Payment Receipt', description: 'Payment confirmation' },
    { value: 'invoice', label: '📄 Invoice', description: 'Billing document' },
    { value: 'bast', label: '📦 BAST', description: 'Handover document' },
    { value: 'purchase_order', label: '📋 Purchase Order', description: 'Order request' },
    { value: 'tax_invoice', label: '💰 Tax Invoice', description: 'Tax-inclusive invoice' },
    { value: 'proforma_invoice', label: '📊 Proforma Invoice', description: 'Quote document' }
  ];

  const handleGenerateDocument = async () => {
    if (!selectedTransaction || !documentType) {
      alert('Please select a transaction and document type.');
      return;
    }

    setIsLoading(true);
    try {
      const input: GenerateDocumentInput = {
        transaction_id: selectedTransaction,
        document_type: documentType,
        document_date: new Date(documentDate),
        recipient_name: recipientName || null,
        custom_notes: customNotes || null
      };

      const document = await trpc.generateDocument.mutate(input);
      
      // Add to generated documents list
      setGeneratedDocuments((prev: Document[]) => [document, ...prev]);
      
      // Reset form
      setSelectedTransaction(null);
      setDocumentType(null);
      setRecipientName('');
      setCustomNotes('');
      setDocumentDate(new Date().toISOString().split('T')[0]);
      
      alert('Document generated successfully! 📄');
    } catch (error) {
      console.error('Failed to generate document:', error);
      alert('Failed to generate document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getDocumentTypeInfo = (type: DocumentType) => {
    const info = documentTypes.find(dt => dt.value === type);
    return info || { label: type, description: '' };
  };

  return (
    <div className="space-y-6">
      {/* Document Generator Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-600" />
            Generate New Document
          </CardTitle>
          <CardDescription>
            Create various business documents from your transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {eligibleTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileX className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No eligible transactions for document generation.</p>
              <p className="text-sm">Only confirmed or paid transactions can generate documents.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <Label>Select Transaction *</Label>
                  <Select
                    value={selectedTransaction?.toString() || ''}
                    onValueChange={(value) => setSelectedTransaction(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose transaction..." />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleTransactions.map((transaction: Transaction) => (
                        <SelectItem key={transaction.id} value={transaction.id.toString()}>
                          <div className="flex items-center space-x-2">
                            <Badge variant={transaction.status === 'paid' ? 'default' : 'secondary'}>
                              {transaction.status === 'paid' ? '💰' : '✅'}
                            </Badge>
                            <span>{transaction.transaction_number}</span>
                            <span className="text-xs text-gray-500">
                              - {transaction.customer_name}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Document Type *</Label>
                  <Select
                    value={documentType || ''}
                    onValueChange={(value: DocumentType) => setDocumentType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose document type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div>{type.label}</div>
                            <div className="text-xs text-gray-500">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Document Date</Label>
                  <Input
                    type="date"
                    value={documentDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocumentDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recipient Name (Optional)</Label>
                  <Input
                    value={recipientName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipientName(e.target.value)}
                    placeholder="Specific recipient name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Custom Notes (Optional)</Label>
                <Textarea
                  value={customNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomNotes(e.target.value)}
                  placeholder="Any custom notes for this document"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleGenerateDocument}
                disabled={isLoading || !selectedTransaction || !documentType}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating Document...</span>
                  </div>
                ) : (
                  <span>📄 Generate Document</span>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Generated Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            Recent Documents
          </CardTitle>
          <CardDescription>
            Documents generated in this session
          </CardDescription>
        </CardHeader>
        <CardContent>
          {generatedDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No documents generated yet.</p>
              <p className="text-sm">Generated documents will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {generatedDocuments.map((doc: Document, index: number) => {
                const typeInfo = getDocumentTypeInfo(doc.document_type);
                return (
                  <Card key={index} className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {typeInfo.label}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Document: {doc.document_number}
                          </p>
                          <p className="text-xs text-gray-500">
                            Generated: {new Date(doc.created_at).toLocaleString()}
                          </p>
                          {doc.recipient_name && (
                            <p className="text-xs text-gray-500">
                              Recipient: {doc.recipient_name}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Document Preview</DialogTitle>
                                <DialogDescription>
                                  {typeInfo.label} - {doc.document_number}
                                </DialogDescription>
                              </DialogHeader>
                              <div 
                                className="border rounded p-4 bg-white"
                                dangerouslySetInnerHTML={{ __html: doc.html_content }}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Documents Browser */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-purple-600" />
            Browse Transaction Documents
          </CardTitle>
          <CardDescription>
            View documents for each transaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eligibleTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No transactions available for document browsing.
            </p>
          ) : (
            <div className="space-y-4">
              {eligibleTransactions.map((transaction: Transaction) => (
                <Card key={transaction.id} className="border-gray-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{transaction.transaction_number}</h3>
                        <p className="text-sm text-gray-600">{transaction.customer_name}</p>
                        <p className="text-xs text-gray-500">
                          Rp {transaction.total_amount.toLocaleString('id-ID')} - {transaction.transaction_date.toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={transaction.status === 'paid' ? 'default' : 'secondary'}>
                        {transaction.status === 'paid' ? '💰 Paid' : '✅ Confirmed'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
