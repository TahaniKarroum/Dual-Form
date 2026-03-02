import { pgTable, serial, varchar, text, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  
  userId: varchar("user_id").notNull().references(() => users.id),
  swName: varchar("sw_name").notNull(),
  supervisorName: varchar("supervisor_name"),
  interviewDate: varchar("interview_date").notNull(),
  
  consentRespondent: boolean("consent_respondent").notNull().default(false),
  consentShareData: boolean("consent_share_data").notNull().default(false),
  
  currentStep: integer("current_step").notNull().default(1),
  
  step2Data: jsonb("step2_data"),
  step3Data: jsonb("step3_data"),
  step4Data: jsonb("step4_data"),
  step5Data: jsonb("step5_data"),
  
  status: varchar("status").notNull().default("draft"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = typeof formSubmissions.$inferInsert;
