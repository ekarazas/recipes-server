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

app.get("/", (req, res) => {
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

    con.end();

    if (data.length !== 1) {
      return res.status(400).send({ error: "Email or password incorrect" });
    }

    const compare = bcrypt.compareSync(req.body.password, data[0].password);

    if (!compare) {
      return res.status(400).send({ error: "Email or password incorrect" });
    }

    const token = jwt.sign(
      { id: data[0].id, email: data[0].email },
      process.env.JWT_SECRET
    );

    return res.send({ msg: "Successfully logged in", token });
  } catch (error) {
    console.log(error);
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

    con.end();

    if (!data.affectedRows) {
      return res.status(500).send({ error: "Unexpected error occurred" });
    }

    return res.send({ msg: "Successfully registered", userId: data.insertId });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ error: "Unexpected error occurred" });
  }
});

app.get("/user", isLoggedIn, async (req, res) => {
  res.send(req.userData);
});

app.get("/recipes", async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);

    const [data] = await con.execute(`SELECT * FROM recipes`);

    con.end();

    return res.send(data);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Unexpected error occurred" });
  }
});

app.get("/recipes/:id", async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);

    const [recipe] = await con.execute(
      `SELECT * FROM recipes WHERE id = ${mysql.escape(req.params.id)}`
    );

    const [comments] = await con.execute(
      `SELECT * FROM comments WHERE recipe_id = ${mysql.escape(req.params.id)}`
    );

    con.end();

    return res.send({ data: { recipe, comments } });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Unexpected error occurred" });
  }
});

app.get("/recipes/:title", async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);

    const [data] = await con.execute(
      `SELECT * FROM recipes WHERE title LIKE '%${req.params.title}%' LIMIT 30`
    );

    con.end();

    return res.send(data);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Unexpected error occurred" });
  }
});

app.post("/recipes", isLoggedIn, async (req, res) => {
  if (!req.body.image || !req.body.title || !req.body.description) {
    return res.status(400).send({ error: "Incorrect data passed" });
  }

  try {
    const con = await mysql.createConnection(mysqlConfig);

    const [data] = await con.execute(
      `INSERT INTO recipes (image, title, description, owner_id) VALUES
      (
      ${mysql.escape(req.body.image)},
      ${mysql.escape(req.body.title)},
      ${mysql.escape(req.body.description)}, 
      ${req.user.id}
      )`
    );

    con.end();

    if (!data.affectedRows) {
      return res.status(500).send({ error: "Unexpected error occurred" });
    }

    return res.send({ msg: "Succesfully added recipe" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Unexpected error occurred" });
  }
});

app.get("/comments", async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);

    const [data] = await con.execute(`SELECT * FROM comments`);

    con.end();

    return res.send(data);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Unexpected error occurred" });
  }
});

app.get("/comments/:recipeID", async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);

    const [data] = await con.execute(
      `SELECT * FROM comments WHERE recipe_id = ${req.params.recipeID}`
    );

    con.end();

    return res.send(data);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Unexpected error occurred" });
  }
});

app.post("/comments/:recipeID", isLoggedIn, async (req, res) => {
  if (!req.body.comment) {
    return res.status(400).send({ error: "Incorrect data passed" });
  }

  try {
    const con = await mysql.createConnection(mysqlConfig);

    const [data] = await con.execute(
      `INSERT INTO comments (recipe_id, user_id, comment) VALUES (
        ${req.params.recipeID}, 
        ${req.user.id}, 
        ${mysql.escape(req.body.comment)})`
    );

    con.end();

    if (!data.affectedRows) {
      return res.status(500).send({ error: "Unexpected error occurred" });
    }

    res.send({ msg: "Successfully added comment" });
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
