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

function generateRandomAccountNumber(){
  return Math.floor(10000000000 + Math.random() * 90000000000);
}

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

//Body of request MUST be in the form of:
/*
{
  UserAccountNumber : "0000000000",
  BalanceDifference : +-500 (any integer)
}
*/
app.post("/api/user/update_balance", async (req, res) => {
  // Update the balance of a user by the User Account Number
  const user = await db.collection("Users").updateOne({"accountnumber" : req.body.UserAccountNumber}, 
                                                    {$inc : {"accountbalance" : req.body.BalanceDifference}});
  res.send(user);
});

//Body of request MUST be in the form of:
/*
{ 
  "name" : "XXXXX",
  "age" : "XX",
  "accountnumber" : "0000000000",
  "accountbalance" : 500 (any integer)
}
*/
app.put("/api/user/add", async (req, res) => {
  // Add a new user to the Users collection
  let accountNumber;
  let userExists;

  do {
    accountNumber = generateRandomAccountNumber();
    userExists = await db.collection("Users").findOne({"accountnumber" : accountNumber});
  } while(userExists);

  req.body.accountnumber = accountNumber;
  const user = await db.collection("Users").insertOne(req.body);
  res.send(user);
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
