export class MongoMemoryServer {
  static async create() {
    return new MongoMemoryServer();
  }

  async getUri(): Promise<string> {
    // Use MONGO_URI when provided (CI workflow sets this to the service),
    // otherwise fall back to a localhost URI so local dev still works
    return process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/test';
  }

  async stop(): Promise<void> {
    // noop for mocked server
    return;
  }
}
