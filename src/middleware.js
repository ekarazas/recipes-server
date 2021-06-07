const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = {
  isLoggedIn(req, res, next) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const user = jwt.verify(token, process.env.JWT_SECRET);
      req.user = user;
      next();
    } catch (e) {
      console.log(e);
      return res.status(500).send({ error: "Unexpected error occurred" });
    }
  },
};
