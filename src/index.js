const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { isLoggedIn } = require("./middleware");

const app = express();

app.use(express.json());
app.use(cors());

const mysqlConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  port: process.env.MYSQL_PORT,
};

app.get("/", isLoggedIn, (req, res) => {
  res.send({ msg: "Server is running successfully" });
});

app.post("/login", async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send({ error: "Incorrect data passed" });
  }

  try {
    const con = await mysql.createConnection(mysqlConfig);

    const [data] = await con.execute(
      `SELECT * FROM users WHERE email = (${mysql.escape(req.body.email)})`
    );

    if (data.length !== 1) {
      return res.status(400).send({ error: "Email or password incorrect" });
    }

    const compare = await bcrypt.compare(req.body.password, data[0].password);

    if (!compare) {
      return res.status(400).send({ error: "Email or password incorrect" });
    }

    const token = jwt.sign(
      { id: data[0].id, email: data[0].email },
      process.env.JWT_SECRET
    );

    res.send({ msg: "Successfully logged in", token });
  } catch (e) {
    console.log(e);
    return res.status(500).send({ error: "Unexpected error occurred" });
  }
});

app.post("/register", async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send({ error: "Incorrect data passed" });
  }

  try {
    const con = await mysql.createConnection(mysqlConfig);

    const hashedPassword = await bcrypt.hashSync(req.body.password, 10);

    const [data] = await con.execute(
      `INSERT INTO users (email, password) VALUES (${mysql.escape(
        req.body.email
      )}, '${hashedPassword}')`
    );

    if (!data.affectedRows) {
      return res.status(500).send({ error: "Unexpected error occurred" });
    }

    res.send({ msg: "Successfully registered", userId: data.insertId });
  } catch (e) {
    console.log(e);
    return res.status(500).send({ error: "Unexpected error occurred" });
  }
});

app.all("*", (req, res) => {
  res.status(404).send({ error: "Page not found" });
});

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Listening on port ${port}`));
