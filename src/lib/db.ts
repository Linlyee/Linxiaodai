/**
 * Database client - auto-detects PostgreSQL vs in-memory fallback.
 * In-memory mode activates when DATABASE_URL points to localhost (no PG running).
 */

import { initMemoryDB, memDB } from './memory-db';

// Eagerly initialize in-memory DB - it's synchronous and fast
initMemoryDB();

let _prisma: unknown = null;
let _useMemory = true;
let _initPromise: Promise<void> | null = null;

async function tryConnectPostgres() {
  const dbUrl = process.env.DATABASE_URL || '';
  // Only try PG if it's not a localhost URL (which is unreachable without PG running)
  if (!dbUrl || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    console.log('[DB] Using in-memory storage (no remote PostgreSQL configured)');
    return;
  }

  try {
    const { PrismaClient } = await import('@prisma/client');
    const client = new PrismaClient();
    await client.$connect();
    _prisma = client;
    _useMemory = false;
    console.log('[DB] PostgreSQL connected successfully');
  } catch (e) {
    console.log('[DB] PostgreSQL unavailable, using in-memory storage:', (e as Error).message);
  }
}

// Start connection attempt (non-blocking)
_initPromise = tryConnectPostgres();

function isMem() {
  return _useMemory || !_prisma;
}

// Export a proxy that routes to either Prisma or memDB
function createDBProxy(): Record<string, unknown> {
  const mem = memDB;

  return {
    user: {
      findUnique: (args: { where: { email?: string; id?: string } }) => {
        if (args.where.email) return Promise.resolve(mem.findUserByEmail(args.where.email));
        if (args.where.id) return Promise.resolve(mem.findUserById(args.where.id));
        return Promise.resolve(null);
      },
      findFirst: (args: { where: { id?: string; email?: string } }) => {
        if (args.where.id) return Promise.resolve(mem.findUserById(args.where.id));
        if (args.where.email) return Promise.resolve(mem.findUserByEmail(args.where.email));
        return Promise.resolve(null);
      },
      create: (args: { data: { name: string; email: string; passwordHash: string } }) =>
        Promise.resolve(mem.createUser(args.data)),
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const u = mem.findUserById(args.where.id);
        if (u) Object.assign(u, args.data);
        return Promise.resolve(u);
      },
    },
    tasteProfile: {
      findUnique: (args: { where: { userId: string } }) =>
        Promise.resolve(mem.findTasteProfile(args.where.userId)),
      findFirst: (args: { where: { userId: string } }) =>
        Promise.resolve(mem.findTasteProfile(args.where.userId)),
      upsert: (args: { where: { userId: string }; update: Record<string, unknown>; create: Record<string, unknown> }) =>
        Promise.resolve(mem.upsertTasteProfile(args.where.userId, args.update)),
      create: (args: { data: { userId: string } & Record<string, unknown> }) =>
        Promise.resolve(mem.upsertTasteProfile(args.data.userId, args.data)),
    },
    address: {
      findMany: (args: { where: { userId: string } }) =>
        Promise.resolve(mem.findAddresses(args.where.userId)),
      findFirst: (args: { where: { id: string; userId?: string } }) =>
        Promise.resolve(mem.findAddressById(args.where.id)),
      create: (args: { data: { userId: string; label: string; detail: string; lat: number; lng: number; isDefault: boolean } }) =>
        Promise.resolve(mem.createAddress(args.data)),
      updateMany: (args: { where: { userId: string }; data: { isDefault: boolean } }) =>
        Promise.resolve(mem.updateAddresses(args.where.userId, args.data)),
      deleteMany: (args: { where: { id: string; userId?: string } }) => {
        mem.deleteAddress(args.where.id);
        return Promise.resolve({ count: 1 });
      },
    },
    restaurant: {
      findMany: () => Promise.resolve(memDB.store.restaurants.map(r => ({ ...r, menuItems: [] }))),
      findUnique: (args: { where: { id: string } }) =>
        Promise.resolve(mem.findRestaurantById(args.where.id)),
      findFirst: (args: { where: { id: string } }) =>
        Promise.resolve(mem.findRestaurantById(args.where.id)),
    },
    menuItem: {
      findMany: () => Promise.resolve(memDB.store.menuItems.map(m => ({ ...m }))),
      findUnique: (args: { where: { id: string } }) =>
        Promise.resolve(mem.findMenuItemById(args.where.id)),
      findFirst: (args: { where: { id: string } }) =>
        Promise.resolve(mem.findMenuItemById(args.where.id)),
    },
    conversation: {
      findMany: (args: { where: { userId: string }; orderBy?: unknown; select?: Record<string, boolean> }) =>
        Promise.resolve(mem.findConversations(args.where.userId)),
      findFirst: (args: { where: { id: string; userId: string } }) =>
        Promise.resolve(mem.findConversation(args.where.id)),
      create: (args: { data: { userId: string; title: string; messages: unknown; extractedRequirements: unknown } }) =>
        Promise.resolve(mem.createConversation(args.data)),
      update: (args: { where: { id: string }; data: { messages?: unknown; extractedRequirements?: unknown } }) =>
        Promise.resolve(mem.updateConversation(args.where.id, { ...args.data, updatedAt: new Date() })),
    },
    order: {
      findMany: (args: { where: { userId: string; status?: string }; orderBy?: unknown; include?: Record<string, boolean | { include: Record<string, boolean> }> }) =>
        Promise.resolve(mem.findOrders(args.where.userId, args.where.status)),
      findFirst: (args: { where: { id: string; userId: string }; include?: Record<string, boolean | { include: Record<string, boolean> }> }) =>
        Promise.resolve(mem.findOrder(args.where.id)),
      create: (args: { data: Record<string, unknown> }) =>
        Promise.resolve(mem.createOrder(args.data as Parameters<typeof mem.createOrder>[0])),
      update: (args: { where: { id: string }; data: Record<string, unknown> }) =>
        Promise.resolve(mem.updateOrder(args.where.id, args.data)),
    },
    favoriteRestaurant: {
      findMany: (args: { where: { userId: string }; include?: Record<string, boolean>; orderBy?: unknown }) =>
        Promise.resolve(mem.findFavorites(args.where.userId)),
      upsert: (args: { where: { userId_restaurantId: { userId: string; restaurantId: string } }; create: Record<string, unknown>; update: Record<string, unknown> }) =>
        Promise.resolve(mem.toggleFavorite(args.where.userId_restaurantId.userId, args.where.userId_restaurantId.restaurantId)),
      deleteMany: (args: { where: { userId: string; restaurantId: string } }) => {
        mem.removeFavorite(args.where.userId, args.where.restaurantId);
        return Promise.resolve({ count: 1 });
      },
    },
    blindBoxResult: {
      create: (args: { data: Record<string, unknown> }) =>
        Promise.resolve(mem.createBlindBox(args.data as Parameters<typeof mem.createBlindBox>[0])),
      deleteMany: () => Promise.resolve({ count: 0 }),
      findMany: () => Promise.resolve([]),
    },
    orderFeedback: {
      create: (args: { data: { orderId: string; userId: string; rating: number; tags: string[]; comment?: string } }) =>
        Promise.resolve(mem.createFeedback(args.data)),
      findFirst: (args: { where: { orderId: string } }) => {
        const fb = memDB.store.feedbacks.find((f: { orderId: string }) => f.orderId === args.where.orderId);
        return Promise.resolve(fb || null);
      },
      deleteMany: () => Promise.resolve({ count: 0 }),
      findUnique: (args: { where: { orderId: string } }) => {
        const fb = memDB.store.feedbacks.find((f: { orderId: string }) => f.orderId === args.where.orderId);
        return Promise.resolve(fb || null);
      },
    },
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
    $transaction: (fn: (p: unknown) => unknown) => Promise.resolve(fn(prisma)),
    $on: () => {},
  };
}

// Export as a proxy that lazily determines whether to use real Prisma or memDB
export const prisma = new Proxy({} as unknown as Record<string, unknown>, {
  get(_target, prop: string) {
    if (!isMem()) {
      return (_prisma as Record<string, unknown>)[prop];
    }
    const memProxy = createDBProxy();
    return memProxy[prop];
  },
});
