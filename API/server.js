const express = require("express");
const mongoose = require("mongoose");
const db = mongoose.connection;

const uri =
  "mongodb+srv://BarclaintGroup:XHfVyF4mkQCPUMTf@freecluster.lfcpx.mongodb.net/Barclaint";

const app = express();

// connecting to mongoDB database using mongoose
mongoose
  .connect(uri)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// this is a basic root path
app.post("/", (req, res) => {
  res.send("Hello World");
});

// make any new endpoints here (e.g /api/companies):
app.get("/api/companies", async (req, res) => {
  // return all documents from the companies mongodb collection:
  const companies = await db.collection("Companies").find({}).toArray();
  console.log(companies);
  console.log(companies.length);
  console.log();
  res.send(companies);
});

app.post("/api/user_transactions", async (req, res) => {
  // Return all transactions to and from a specific user by the UserAccountNumber
  const transactions = await db
    .collection("Transactions")
    .find({to: req.header.UserAccountNumber })
    .toArray();
    res.send(transactions);
});


// gets the company RAG score
app.get("/api/companies/companyScore/:company", async (req, res) => {
  let companyName = req.params.company;
  // const company = await db.collection("Companies").find({"Company Name": companyName}).toArray();
  const company = await db.collection("Companies").findOne({"Company Name": companyName});
  console.log(company)
  var carbonEmissions = Number(company["Carbon Emissions"]);
  var wasteManagement = Number(company["Waste Management"]);
  var sustainabilityPractices = Number(company["Sustainability Practices"]);
  console.log(carbonEmissions);
  console.log(wasteManagement);
  console.log(sustainabilityPractices);
  let ragScore = (carbonEmissions+wasteManagement+sustainabilityPractices)/(30);
  console.log(ragScore);
  console.log(company.Summary);
  res.send(company);
});

// listening to the server on port 3000
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
