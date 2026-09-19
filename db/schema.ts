import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    pet: text("pet").notNull(),
    category: text("category").notNull(),
    price: real("price").notNull(),
    originalPrice: real("originalPrice").notNull().default(0),
    size: text("size").notNull(),
    stock: integer("stock").notNull().default(0),
    description: text("description").notNull(),
    image: text("image").notNull().default(""),
    images: text("images").notNull().default("[]"),
    art: integer("art").notNull().default(0),
    badge: text("badge").notNull().default(""),
    active: integer("active").notNull().default(1),
  },
  (t) => [
    check("products_stock_nonnegative", sql`${t.stock} >= 0`),
    check("products_price_nonnegative", sql`${t.price} >= 0`),
  ],
);
export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
});
export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    userId: text("userId").notNull(),
    customer: text("customer").notNull(),
    items: text("items").notNull(),
    total: real("total").notNull(),
    shipping: real("shipping").notNull(),
    status: text("status").notNull().default("awaiting_payment"),
    tracking: text("tracking").notNull().default(""),
    slip: text("slip").notNull().default(""),
    bank: text("bank").notNull(),
    demo: integer("demo").notNull(),
    createdAt: text("createdAt").notNull(),
    paymentDueAt: text("paymentDueAt"),
    requestId: text("requestId").notNull(),
  },
  (t) => [
    index("orders_user_created").on(t.userId, t.createdAt),
    index("orders_status_created").on(t.status, t.createdAt),
    uniqueIndex("orders_user_request").on(t.userId, t.requestId),
  ],
);
export const orderLines = sqliteTable(
  "order_lines",
  {
    id: text("id").primaryKey(),
    orderId: text("orderId")
      .notNull()
      .references(() => orders.id),
    productId: text("productId")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    price: real("price").notNull(),
  },
  (t) => [
    index("lines_order").on(t.orderId),
    check("line_positive_quantity", sql`${t.quantity}>0`),
  ],
);
export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    userName: text("userName").notNull(),
    sender: text("sender").notNull(),
    text: text("text").notNull(),
    createdAt: text("createdAt").notNull(),
  },
  (t) => [index("messages_user_created").on(t.userId, t.createdAt)],
);
export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    productId: text("productId")
      .notNull()
      .references(() => products.id),
    userId: text("userId").notNull(),
    orderId: text("orderId")
      .notNull()
      .references(() => orders.id),
    nickname: text("nickname").notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    demo: integer("demo").notNull(),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (t) => [
    uniqueIndex("reviews_product_user_mode").on(t.productId, t.userId, t.demo),
    index("reviews_product_demo_created").on(t.productId, t.demo, t.createdAt),
    check("reviews_rating_valid", sql`${t.rating} >= 1 AND ${t.rating} <= 5`),
  ],
);
