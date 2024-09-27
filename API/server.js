require("dotenv").config();
const express = require("express");

const transaction_router = require("./routes/transactions");
const companies_router = require("./routes/companies");
const users_router = require("./routes/users");

const app = express();
app.use(express.json());
app.use(transaction_router);
app.use(companies_router);
app.use(users_router);

// this is a basic root path
app.get("/", (req, res) => {
  console.log("Hello World");
  res.send("Hello World");
});

// listening to the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
