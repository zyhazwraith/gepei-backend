import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// 确保加载 .env 文件
dotenv.config();

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "mysql://root:@localhost:3306/gepei_db",
  },
});
