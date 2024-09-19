const express = require("express");
const mongoose = require("mongoose");
const db = mongoose.connection;

const uri =
  "mongodb+srv://BarclaintGroup:XHfVyF4mkQCPUMTf@freecluster.lfcpx.mongodb.net/Barclaint";

const app = express();
app.use(express.json());

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
  console.log(req.body.UserAccountNumber);
  const transactions = await db
    .collection("Transactions")
    .find({ "from": req.body.UserAccountNumber })
    .toArray();
  res.send(transactions);
  console.log("Hello")

});


app.post("/api/user_transactions/to", async (req, res) => {
  // Return all transactions from a specific company by the Company Account Number
  const transactions = await db
    .collection("Transactions")
    .find({ 
      "to": req.body.CompanyAccountNumber,
      "from": req.body.UserAccountNumber
    })
    .toArray();
    res.send(transactions);

});





// gets the company RAG score
app.get("/api/companies/companyScore/:company", async (req, res) => {
  let companyName = req.params.company;
  const company = await db.collection("Companies").find({"Company Name": companyName}).toArray();
  var carbonEmissions = Number(company[0]["Carbon Emissions"]);
  var wasteManagement = Number(company[0]["Waste Management"]);
  var sustainabilityPractices = Number(company[0]["Sustainability Practices"]);
  console.log(carbonEmissions);
  console.log(wasteManagement);
  console.log(sustainabilityPractices);
  let ragScore = (carbonEmissions+wasteManagement+sustainabilityPractices)/(30);
  console.log(ragScore);
  res.send(company);
});

// listening to the server on port 3000
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
