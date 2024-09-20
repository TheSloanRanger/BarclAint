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
  db.collection("Companies").findOneAndUpdate({"Account Number": accountNumber},{$set: response});
  res.send("Success");
});

app.post("/api/user_transactions", async (req, res) => {
  // Return all transactions to and from a specific user by the UserAccountNumber
  const transactions = await db
    .collection("Transactions")
    .find({to: req.header.UserAccountNumber })
    .toArray();
    res.send(transactions);
});



// listening to the server on port 3000
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
