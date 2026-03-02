import { db } from "./db.js";
import { formSubmissions, users } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import type { InsertFormSubmission, FormSubmission, UpsertUser, User } from "../shared/schema.js";

class Storage {
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

  async createForm(data: InsertFormSubmission): Promise<FormSubmission> {
    const [form] = await db.insert(formSubmissions).values(data).returning();
    return form;
  }

  async getForm(id: number): Promise<FormSubmission | undefined> {
    const [form] = await db.select().from(formSubmissions).where(eq(formSubmissions.id, id));
    return form;
  }

  async getFormsByUser(userId: string): Promise<FormSubmission[]> {
    return await db.select().from(formSubmissions).where(eq(formSubmissions.userId, userId));
  }

  async updateForm(id: number, data: Partial<InsertFormSubmission>): Promise<FormSubmission | undefined> {
    const [form] = await db
      .update(formSubmissions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(formSubmissions.id, id))
      .returning();
    return form;
  }
}

export const storage = new Storage();
