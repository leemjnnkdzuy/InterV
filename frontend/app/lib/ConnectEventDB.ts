import mongoose, { type Connection } from "mongoose";

interface EventMongooseCache {
  conn: Connection | null;
  promise: Promise<Connection> | null;
}

function getMongoEventUri(): string {
  const uri = process.env.MONGODB_URI_EVENT?.trim();
  if (!uri) {
    throw new Error(
      "Please define the MONGODB_URI_EVENT environment variable inside .env"
    );
  }
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    throw new Error("MONGODB_URI_EVENT must be a MongoDB connection string");
  }
  return uri;
}

function getEventDbName(): string {
  const value = process.env.MONGODB_EVENT_DB_NAME?.trim() || "interv-events";
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(value)) {
    throw new Error("MONGODB_EVENT_DB_NAME is invalid");
  }
  return value;
}

const globalForEventMongoose = globalThis as typeof globalThis & {
  eventMongoose?: EventMongooseCache;
};

const cached: EventMongooseCache =
  globalForEventMongoose.eventMongoose ??
  (globalForEventMongoose.eventMongoose = {
    conn: null,
    promise: null,
  });

export function getEventDBConnection(): Connection {
  if (!cached.conn) {
    cached.conn = mongoose.createConnection(getMongoEventUri(), {
      dbName: getEventDbName(),
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10_000,
    });
    cached.promise = cached.conn.asPromise();
  }
  return cached.conn;
}

export default async function connectEventDB(): Promise<Connection> {
  const connection = getEventDBConnection();
  try {
    await cached.promise;
    return connection;
  } catch (error) {
    await connection.close().catch(() => undefined);
    cached.conn = null;
    cached.promise = null;
    throw error;
  }
}
