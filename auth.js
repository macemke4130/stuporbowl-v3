import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import { query, apiRoute, prepData } from "./dbConnect.js";

import config from "./config/index.js";
const privateKey = config.keys.jwt;

const saltRounds = 10;

const unauthorizedResponse = {
  message: "Unauthorized",
  status: 401,
  data: null,
};

const router = express.Router();

router.post(`${apiRoute}/admin/login-attempt`, async (req, res) => {
  try {
    const { email: emailFromClient, password: passwordFromClient } = req.body;

    const sql = await query(`SELECT id, email, password, permissions, full_name FROM users WHERE email = "${emailFromClient}" LIMIT 1`);

    const userFromServer = sql[0];
    const passwordMatch = await bcrypt.compare(passwordFromClient, userFromServer.password);

    if (passwordMatch) {
      const jwtPayload = {
        email: userFromServer.email,
        permissions: userFromServer.permissions,
      };

      const token = jwt.sign(jwtPayload, privateKey, { expiresIn: "365d" });

      res.json({
        message: "Login Success",
        status: 200,
        data: {
          token,
          id: userFromServer.id,
          displayName: userFromServer.full_name,
          email: userFromServer.email,
          permissions: userFromServer.permissions,
        },
      });
    } else {
      res.json({
        message: "Unauthorized",
        status: 401,
        data: null,
      });
    }
  } catch (error) {
    res.json({
      message: "Unauthorized",
      status: 401,
      data: null,
    });
  }
});

router.post(`${apiRoute}/admin/new-user`, async (req, res) => {
  try {
    const { email, password, fullName, permissions } = req.body;

    // Check permissions.

    // const authorized = await validateJWT(jwt);

    // if (authorized.data == false) {
    //   res.json({ message: "Unauthorized", status: 401, data: null });
    // }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const sql = await query(
      `INSERT INTO users (full_name, email, password, permissions) VALUES ("${fullName}", "${email}", "${hashedPassword}", "${permissions}");`,
    );

    const response = {
      message: "Successfully created new user.",
      status: 200,
      data: sql,
    };

    res.json(response);
  } catch (error) {
    const response = {
      message: error.sqlMessage,
      status: error.errno,
      data: null,
    };

    res.json(response);
  }
});

const permissionList = ["is-admin", "new-post", "edit-post", "delete-post", "new-user", "edit-user", "delete-user", "read-racer", "edit-racer"];

const validateRequest = (token, actions) => {
  token = token.split("Bearer ")[1];

  const tokenIsValid = validateJWT(token);

  if (tokenIsValid === false) {
    return false;
  }

  const decodedPayload = jwt.decode(token);
  const userPermissions = decodedPayload.permissions.split("").map((str) => Number(str));

  const isAdmin = !!userPermissions[0];
  if (isAdmin) return true;

  return actions.every((action) => {
    const actionIndex = permissionList.indexOf(action);

    if (actionIndex === -1) {
      throw new Error("Action not found in [permissionList]");
      return false;
    }

    return userPermissions[actionIndex] === 1;
  });
};

router.post(`${apiRoute}/admin/edit-post`, async (req, res) => {
  const valid = validateRequest(req.headers.authorization, ["edit-post"]);

  if (!valid) {
    res.json(unauthorizedResponse);
    return;
  }

  const { postId, title, content } = req.body;

  const sql = await query(`UPDATE posts SET title = ?, content = ? WHERE id = ?`, [title, content, postId]);

  res.json(sql);
});

router.post(`${apiRoute}/admin/new-post`, async (req, res) => {
  const valid = validateRequest(req.headers.authorization, ["new-post"]);

  if (!valid) {
    res.json(unauthorizedResponse);
    return;
  }

  const data = prepData(req.body);

  const sql = await query(`INSERT INTO posts (${data.columns}) VALUES (${data.marks})`, data.values);

  res.json(sql);
});

const validateJWT = async (tokenFromClient) => {
  return await jwt.verify(tokenFromClient, privateKey, function (err, decoded) {
    return err ? false : true;
  });
};

router.post(`${apiRoute}/admin/validate-jwt`, async (req, res) => {
  const tokenFromClient = req.body.token;
  const isValidToken = await validateJWT(tokenFromClient);
  res.json(isValidToken);
});

(async () => {
  const hashedPassword = await bcrypt.hash("test1", saltRounds);
  // console.log(hashedPassword);
})();

export default router;
