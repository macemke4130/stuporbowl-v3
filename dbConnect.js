import * as mysql from "mysql2";
import config from "./config/index.js";
import { createPool } from "mysql2";

export const apiRoute = "/api";

export const prepData = (data) => {
  // How many question marks to display for MySQL VALUES().
  const marks = Object.keys(data).fill("?").join(", ");

  // Which MySQL columns to provide.
  const columns = Object.keys(data);

  // Data values for MySQL.
  const values = Object.values(data);

  return {
    marks,
    columns,
    values,
  };
};

const pool = createPool(config.mysql);

export const query = (query, values) => {
  return new Promise((resolve, reject) => {
    const sql = mysql.format(query, values);
    console.log("SQL: " + sql);
    pool.query(sql, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

export const transaction = async (callback) => {
  // 1. Get a dedicated connection from the pool
  const connection = await new Promise((resolve, reject) => {
    pool.getConnection((err, conn) => (err ? reject(err) : resolve(conn)));
  });

  // 2. Create a query executor locked to this connection
  const connQuery = (sqlString, values) => {
    return new Promise((resolve, reject) => {
      const sql = mysql.format(sqlString, values);
      console.log("TRANSACTION SQL: " + sql);
      connection.query(sql, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  };

  try {
    // 3. Start transaction
    await new Promise((resolve, reject) => {
      connection.beginTransaction((err) => (err ? reject(err) : resolve()));
    });

    // 4. Run user's queries passing the isolated query runner
    const result = await callback(connQuery);

    // 5. Commit if everything succeeds
    await new Promise((resolve, reject) => {
      connection.commit((err) => (err ? reject(err) : resolve()));
    });

    return result;
  } catch (error) {
    // 6. Rollback on failure
    await new Promise((resolve) => connection.rollback(() => resolve()));
    throw error;
  } finally {
    // 7. ALWAYS release connection back to the pool
    connection.release();
  }
};
