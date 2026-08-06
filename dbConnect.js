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
