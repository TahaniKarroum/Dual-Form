import { users, type User, type UpsertUser } from "../../../shared/schema.js";
import { db } from "../../db.js";
import { eq } from "drizzle-orm";

class AuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: { ...userData, updatedAt: new Date() },
      })
      .returning();
    return user;
  }
}

export const storage = new AuthStorage();
