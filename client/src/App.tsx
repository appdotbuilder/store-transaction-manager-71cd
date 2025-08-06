
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Package, Receipt, FileText, Search, Plus } from 'lucide-react';
import { StoreProfileForm } from '@/components/StoreProfileForm';
import { CatalogManager } from '@/components/CatalogManager';
import { TransactionForm } from '@/components/TransactionForm';
import { TransactionHistory } from '@/components/TransactionHistory';
import { DocumentGenerator } from '@/components/DocumentGenerator';
import { trpc } from '@/utils/trpc';
import type { StoreProfile, CatalogItem, Transaction } from '../../server/src/schema';

function App() {
  const [activeTab, setActiveTab] = useState<string>('store-profile');
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load initial data
  const loadStoreProfile = useCallback(async () => {
    try {
      const profile = await trpc.getStoreProfile.query();
      setStoreProfile(profile);
    } catch (error) {
      console.error('Failed to load store profile:', error);
    }
  }, []);

  const loadCatalogItems = useCallback(async () => {
    try {
      const items = await trpc.getCatalogItems.query();
      setCatalogItems(items);
    } catch (error) {
      console.error('Failed to load catalog items:', error);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const transactionList = await trpc.getTransactionHistory.query();
      setTransactions(transactionList);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      loadStoreProfile(),
      loadCatalogItems(),
      loadTransactions()
    ]);
    setIsLoading(false);
  }, [loadStoreProfile, loadCatalogItems, loadTransactions]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleStoreProfileUpdate = useCallback((profile: StoreProfile) => {
    setStoreProfile(profile);
  }, []);

  const handleCatalogUpdate = useCallback(() => {
    loadCatalogItems();
  }, [loadCatalogItems]);

  const handleTransactionUpdate = useCallback(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = transactions.filter((transaction: Transaction) =>
    transaction.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.transaction_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🏪 Store Management System
          </h1>
          <p className="text-lg text-gray-600">
            Complete transaction and document management solution
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Store Profile</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {storeProfile ? '✓' : '⚠️'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Package className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Catalog Items</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {catalogItems.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Receipt className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {transactions.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Documents</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {transactions.reduce((acc: number, t: Transaction) => acc + (t.status === 'confirmed' || t.status === 'paid' ? 1 : 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="store-profile" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Store Profile
            </TabsTrigger>
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Catalog
            </TabsTrigger>
            <TabsTrigger value="transaction" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Transaction
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          {/* Store Profile Tab */}
          <TabsContent value="store-profile" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Store Profile Management
                </CardTitle>
                <CardDescription>
                  Manage your store's basic information and settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StoreProfileForm
                  initialData={storeProfile}
                  onUpdate={handleStoreProfileUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Catalog Tab */}
          <TabsContent value="catalog" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Item & Service Catalog
                </CardTitle>
                <CardDescription>
                  Manage your inventory and service offerings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CatalogManager
                  catalogItems={catalogItems}
                  onUpdate={handleCatalogUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* New Transaction Tab */}
          <TabsContent value="transaction" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-purple-600" />
                  Create New Transaction
                </CardTitle>
                <CardDescription>
                  Record a new sale with automatic tax calculations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {catalogItems.length > 0 ? (
                  <TransactionForm
                    catalogItems={catalogItems}
                    onSuccess={handleTransactionUpdate}
                  />
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      No catalog items found. Please add some items or services first.
                    </p>
                    <Button onClick={() => setActiveTab('catalog')} variant="outline">
                      Go to Catalog
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-purple-600" />
                  Transaction History
                </CardTitle>
                <CardDescription>
                  View and manage all your transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search transactions by customer name or transaction number..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <TransactionHistory
                  transactions={filteredTransactions}
                  onUpdate={handleTransactionUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-600" />
                  Document Generation
                </CardTitle>
                <CardDescription>
                  Generate and manage transaction documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentGenerator transactions={transactions} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p>Loading...</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
