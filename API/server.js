require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const Joi = require("joi");

const { userTransactionSchema, userTransactionToSchema, userUpdateBalanceSchema, userAddSchema } = require('./validation_schemas');

const db = mongoose.connection;

const uri =
  "mongodb+srv://BarclaintGroup:XHfVyF4mkQCPUMTf@freecluster.lfcpx.mongodb.net/Barclaint";

const app = express();
app.use(express.json());

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
app.get("/", (req, res) => {
  console.log("Hello World");
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

function getRAGScore(company){
  let carbonEmissions = Number(company["Carbon Emissions"]);
  let wasteManagement = Number(company["Waste Management"]);
  let sustainabilityPractices = Number(company["Sustainability Practices"]);
  let ragScore = `${(carbonEmissions+wasteManagement+sustainabilityPractices)/(30)}`;
  return parseFloat(ragScore);
}

// gets the company RAG score
app.get("/api/companies/companyScore/:accountNumber", async (req, res) => {
  let accountNumber = req.params.accountNumber;
  const company = await db.collection("Companies").findOne({"Account Number": accountNumber});
  res.send(`{"RAG":${getRAGScore(company)}}`);
});

app.get("/api/companies/similarCompanies/:accNo", async (req, res) => {
  let accountNumber = req.params.accNo;
  console.log(accountNumber);
  const company = await db.collection("Companies").findOne({"Account Number": accountNumber});
  var lowestScore = getRAGScore(company); // because the companies won't get shown if they are not equal or better
  const companies = await db.collection("Companies").find({"Spending Category": company["Spending Category"]}).toArray();
  var table = [];
  for(var i=0; i < companies.length; i++){
    if (companies[i]["Account Number"] === company["Account Number"]){
      continue;
    }
    let ragScore = getRAGScore(companies[i]);
    if (ragScore > lowestScore){
      console.log(`CONTENDER: ${companies[i]["Company Name"]} SCORE: ${ragScore}`);
      companies[i]["RAG"] = parseFloat(ragScore);
      table.push(companies[i]);
      continue;
    }
    console.log(`REJECTED: ${companies[i]["Company Name"]} SCORE: ${getRAGScore(companies[i])}`);
  }
  res.send(table);
});

/*
Update the company score
takes the company ID and all the scores, or just single ones in the body...
example body:
{
  "Account Number": "000000006",
  "Sustainability Practices": "2",
  "Waste Management":"3",
  "Carbon Emissions":"1",
}
*/ 
app.put("/api/companies/updateEnvironmentalImpactScore", async (req, res) => {
  let keys = ["Sustainability Practices", "Waste Management", "Carbon Emissions"];
  let accountNumber = req.body["Account Number"];
  let selectedKeys = []; // spare iterative table so that I can track what keys and values have been inserted into the dictionary
  let updateTable = [];
  if (typeof accountNumber !== "string"){
    res.send("Invalid Account Number");
    return;
  }
  for (let i=0; i < keys.length; i++){
    let str = `key: ${keys[i]} \nvalue: ${req.body[keys[i]]}`;
    if(req.body[keys[i]]){
      if (typeof req.body[keys[i]] !== "string"){
        res.send(`Invalid ${keys[i]}`);
        return;
      }
      updateTable[keys[i]] = req.body[keys[i]];
      selectedKeys.push(keys[i]);
    }
  }


  if(selectedKeys.length == 0){
    res.send("No values sent");
    return;
  }

  let response = "{";
  console.log(`hello ${"world"}`);
  for(let i=0; i<selectedKeys.length; i++){
    if(i!==selectedKeys.length-1){
      let tempString = `"${selectedKeys[i]}":"${updateTable[selectedKeys[i]]}",`;
      response = response.concat(tempString);
    }else{
      let tempString = `"${selectedKeys[i]}":"${updateTable[selectedKeys[i]]}"}`;
      response = response.concat(tempString);
    }
  }
  response = JSON.parse(response);
  console.log(updateTable)
  console.log(response)
  db.collection("Companies").findOneAndUpdate({"Account Number": accountNumber},{$set: response});
  res.send("Success");
});

/*

*/
app.post("/api/companies/addCompany", async (req, res) => {

});

/*
  deletes the company associated to account number
  account number is sent via body
  returns success, or an error message if there is anything invalid or if the account number does not exist
*/
app.delete("/api/companies/deleteCompany", async (req, res) => {
  let accountNumber = req.body["Account Number"];
  // input validation, making sure that the account number fits the criteria for a business account
  if(typeof accountNumber !== 'string' || accountNumber.length === 10){
    res.send("Invalid account number");
    return;
  }
  let company = await db.collection("Companies").findOne({"Account Number": accountNumber});
  if(company === null){
    res.send("Company not found");
    return; 
  }
  db.collection("Companies").deleteOne(
    {"Account Number": company["Account Number"]},
    {justOne:true}
  );
  res.send(company); 
});

app.post("/api/user_transactions", async (req, res) => {

  // Validate the request body
  const {error} = userTransactionSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

  // Return all transactions from a specific user by the UserAccountNumber
  console.log(req.body.UserAccountNumber);
  const transactions = await db
    .collection("Transactions")
    .find({ "from": req.body.UserAccountNumber })
    .toArray();
  res.send(transactions);
  console.log("Hello")

});


app.post("/api/user_transactions/to", async (req, res) => {

  // Validate the request body
  const {error} = userTransactionToSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

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

  // Validate the request body
  const {error} = userUpdateBalanceSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

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
  "accountbalance" : 500 (any integer)
}
*/
app.put("/api/user/add", async (req, res) => {

  // Validate the request body
  const {error} = userAddSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
