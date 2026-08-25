import * as dotenv from "dotenv";

dotenv.config();

export default {
  mysql: {
    connectionLimit: 10,
    host: process.env.JAWSDB_URL,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_SCHEMA,
  },
  keys: {
    jwt: process.env.JWT_SECRET,
  },
};
