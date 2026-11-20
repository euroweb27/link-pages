import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`);

// The people who have used the app, keyed by the Gateway's user id.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: createdAt(),
});

export const pages = sqliteTable(
  "pages",
  {
    id: text("id").primaryKey(),
    // The owner (`user.id`); every editor query filters by it.
    userId: text("user_id").notNull(),
    handle: text("handle").notNull(),
    name: text("name").notNull(),
    bio: text("bio").notNull().default(""),
    avatarKey: text("avatar_key"),
    avatarType: text("avatar_type"),
    theme: text("theme", { enum: ["light", "dark"] })
      .notNull()
      .default("light"),
    buttons: text("buttons", { enum: ["rounded", "square"] })
      .notNull()
      .default("rounded"),
    published: integer("published", { mode: "boolean" })
      .notNull()
      .default(false),
    signupEnabled: integer("signup_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    signupHeading: text("signup_heading").notNull().default(""),
    signupAskDetails: integer("signup_ask_details", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("pages_handle").on(table.handle),
    index("pages_user").on(table.userId),
  ],
);

export const items = sqliteTable(
  "items",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    kind: text("kind", { enum: ["link", "header"] }).notNull(),
    title: text("title").notNull(),
    url: text("url"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    // ISO 8601 in UTC; outside the window the link is hidden.
    startsAt: text("starts_at"),
    endsAt: text("ends_at"),
    createdAt: createdAt(),
  },
  (table) => [index("items_page").on(table.pageId, table.position)],
);

export const signups = sqliteTable(
  "signups",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name"),
    phone: text("phone"),
    createdAt: createdAt(),
    updatedAt: createdAt(),
  },
  (table) => [uniqueIndex("signups_page_email").on(table.pageId, table.email)],
);

export const pageViews = sqliteTable(
  "page_views",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    at: text("at").notNull(),
    source: text("source").notNull(),
    country: text("country").notNull(),
  },
  (table) => [index("page_views_page_at").on(table.pageId, table.at)],
);

export const clicks = sqliteTable(
  "clicks",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    at: text("at").notNull(),
    country: text("country").notNull(),
  },
  (table) => [index("clicks_page_at").on(table.pageId, table.at)],
);
