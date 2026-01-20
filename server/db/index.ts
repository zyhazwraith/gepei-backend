import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema.js";
import dotenv from 'dotenv';

// 确保在连接前加载环境变量 (为了脚本执行)
dotenv.config();

// 创建数据库连接池
const poolConnection = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "gepei_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 初始化 Drizzle
export const db = drizzle(poolConnection, { schema, mode: "default" });

export default db;
