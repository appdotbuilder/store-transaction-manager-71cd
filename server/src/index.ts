
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createStoreProfileInputSchema,
  updateStoreProfileInputSchema,
  createCatalogItemInputSchema,
  updateCatalogItemInputSchema,
  catalogSearchInputSchema,
  createTransactionInputSchema,
  updateTransactionInputSchema,
  transactionHistoryInputSchema,
  generateDocumentInputSchema
} from './schema';

// Import handlers
import { createStoreProfile } from './handlers/create_store_profile';
import { updateStoreProfile } from './handlers/update_store_profile';
import { getStoreProfile } from './handlers/get_store_profile';
import { createCatalogItem } from './handlers/create_catalog_item';
import { updateCatalogItem } from './handlers/update_catalog_item';
import { deleteCatalogItem } from './handlers/delete_catalog_item';
import { getCatalogItems } from './handlers/get_catalog_items';
import { getCatalogItemById } from './handlers/get_catalog_item_by_id';
import { createTransaction } from './handlers/create_transaction';
import { updateTransaction } from './handlers/update_transaction';
import { getTransactionById } from './handlers/get_transaction_by_id';
import { getTransactionHistory } from './handlers/get_transaction_history';
import { deleteTransaction } from './handlers/delete_transaction';
import { generateDocument } from './handlers/generate_document';
import { getDocumentsByTransaction } from './handlers/get_documents_by_transaction';
import { getDocumentById } from './handlers/get_document_by_id';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Store Profile routes
  createStoreProfile: publicProcedure
    .input(createStoreProfileInputSchema)
    .mutation(({ input }) => createStoreProfile(input)),
  
  updateStoreProfile: publicProcedure
    .input(updateStoreProfileInputSchema)
    .mutation(({ input }) => updateStoreProfile(input)),
  
  getStoreProfile: publicProcedure
    .query(() => getStoreProfile()),

  // Catalog Item routes
  createCatalogItem: publicProcedure
    .input(createCatalogItemInputSchema)
    .mutation(({ input }) => createCatalogItem(input)),
  
  updateCatalogItem: publicProcedure
    .input(updateCatalogItemInputSchema)
    .mutation(({ input }) => updateCatalogItem(input)),
  
  deleteCatalogItem: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteCatalogItem(input)),
  
  getCatalogItems: publicProcedure
    .input(catalogSearchInputSchema.optional())
    .query(({ input }) => getCatalogItems(input)),
  
  getCatalogItemById: publicProcedure
    .input(z.number())
    .query(({ input }) => getCatalogItemById(input)),

  // Transaction routes
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),
  
  updateTransaction: publicProcedure
    .input(updateTransactionInputSchema)
    .mutation(({ input }) => updateTransaction(input)),
  
  getTransactionById: publicProcedure
    .input(z.number())
    .query(({ input }) => getTransactionById(input)),
  
  getTransactionHistory: publicProcedure
    .input(transactionHistoryInputSchema.optional())
    .query(({ input }) => getTransactionHistory(input)),
  
  deleteTransaction: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteTransaction(input)),

  // Document routes
  generateDocument: publicProcedure
    .input(generateDocumentInputSchema)
    .mutation(({ input }) => generateDocument(input)),
  
  getDocumentsByTransaction: publicProcedure
    .input(z.number())
    .query(({ input }) => getDocumentsByTransaction(input)),
  
  getDocumentById: publicProcedure
    .input(z.number())
    .query(({ input })=> getDocumentById(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
