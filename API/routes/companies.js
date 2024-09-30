const express = require("express");
const companies_router = express.Router();
const { db } = require("../db");

const {
  getCompanySchema,
  companyAddSchema,
} = require("../validation_schemas");

// make any new endpoints here (e.g /api/companies):
companies_router.get("/api/companies", async (req, res) => {
  // return all documents from the companies mongodb collection:
  const companies = await db.collection("Companies").find({}).toArray();
  console.log(companies);
  console.log(companies.length);
  res.send(companies);
});

companies_router.get("/api/companies/lazy_load_company", async (req, res) => {
  try {
    // Fetch all documents from the Companies collection with only the Company Name and Account Number fields
    const companies = await db
      .collection("Companies")
      .find({}, { projection: { "Company Name": 1, "Account Number": 1 } })
      .toArray();

    // Map the result to the desired format
    const lazyLoadCompanies = companies.map((company) => ({
      CompanyName: company["Company Name"],
      AccountNumber: company["Account Number"],
    }));

    res
      .status(200)
      .send({ message: "success", lazy_load_companies: lazyLoadCompanies });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ error: "An error occurred while fetching companies." });
  }
});

// receives the body from
companies_router.post("/api/companies/getCompany", async (req, res) => {
  const accountNumber = req.body["Account Number"];
  const { error } = getCompanySchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }
  if (accountNumber.length !== 9) {
    res.send("Invalid Account Number");
    return;
  } else {
    let company = await db
      .collection("Companies")
      .findOne({ "Account Number": accountNumber });
    if (company === null) {
      res.send("Account not found");
      return;
    }
    res.send(company);
  }
});

companies_router.put(
  "/api/companies/updateEnvironmentalImpactScore",
  async (req, res) => {
    let keys = [
      "Sustainability Practices",
      "Waste Management",
      "Carbon Emissions",
    ];
    let accountNumber = req.body["Account Number"];
    let selectedKeys = []; // spare iterative table so that I can track what keys and values have been inserted into the dictionary
    let updateTable = [];
    if (typeof accountNumber !== "string") {
      res.send("Invalid Account Number");
      return;
    }
    for (let i = 0; i < keys.length; i++) {
      let str = `key: ${keys[i]} \nvalue: ${req.body[keys[i]]}`;
      if (req.body[keys[i]]) {
        if (typeof req.body[keys[i]] !== "string") {
          res.send(`Invalid ${keys[i]}`);
          return;
        }
        updateTable[keys[i]] = req.body[keys[i]];
        selectedKeys.push(keys[i]);
      }
    }

    if (selectedKeys.length == 0) {
      res.send("No values sent");
      return;
    }

    let response = "{";
    console.log(`hello ${"world"}`);
    for (let i = 0; i < selectedKeys.length; i++) {
      if (i !== selectedKeys.length - 1) {
        let tempString = `"${selectedKeys[i]}":"${
          updateTable[selectedKeys[i]]
        }",`;
        response = response.concat(tempString);
      } else {
        let tempString = `"${selectedKeys[i]}":"${
          updateTable[selectedKeys[i]]
        }"}`;
        response = response.concat(tempString);
      }
    }
    response = JSON.parse(response);
    console.log(updateTable);
    console.log(response);
    db.collection("Companies").findOneAndUpdate(
      { "Account Number": accountNumber },
      { $set: response }
    );
    res.send("Success");
  }
);

/*
  receives the following body: 
  {
    "Company Name": string,
    "Spending Category": string,
    "Carbon Emissions": string,
    "Waste Management": string,
    "Sustainability Practices": string,
    "Summary": string
  }
*/
companies_router.post("/api/companies/addCompany", async (req, res) => {
  let keys = [
    "Company Name",
    "Spending Category",
    "Carbon Emissions",
    "Waste Management",
    "Sustainability Practices",
    "Summary",
  ];
  let values = []; // the dictionary is going to get stored here with the body values once it has all been validated
  const { error } = companyAddSchema.validate(req.body); // CANT FIGURE OUT HOW TO WORK ASK JAKE TMRW
  if (error) {
    return res.status(400).send(error.details[0].message);
  }
  for (let i = 0; i < keys.length; i++) {
    // since these are purely strings and won't require numerical operations, just making sure that they are getting filled
    if (
      keys[i] === "Company Name" ||
      keys[i] === "Spending Category" ||
      keys[i] === "Summary"
    ) {
      let temp = req.body[keys[i]];
      //typeof temp !== 'string' || was inside, but removed for now while i test Joi
      if (typeof temp !== "string" || temp.length < 1) {
        res.send(`Invalid ${keys[i]}`);
        return;
      }
      values[keys[i]] = temp;
    } else if (
      keys[i] === "Carbon Emissions" ||
      keys[i] === "Waste Management" ||
      keys[i] === "Sustainability Practices"
    ) {
      // this method also accepts decimals, it will just truncate anything after the . ex: 9.9 turns into 9
      // for example, 1.1 turns into 1,
      let temp = parseInt(req.body[keys[i]]);
      if (isNaN(temp) || temp < 0 || temp > 10) {
        res.send(`Invalid ${keys[i]}`);
        return;
      }
      values[keys[i]] = temp.toString();
    }
  }
  //https://stackoverflow.com/a/65549541
  if (Object.keys(keys).length !== Object.keys(values).length) {
    //tempory solution until i get joi working
    res.send("Required fields missing");
    return;
  }

  let accountNumber;
  let companyExists;
  // loop makes sure that the account number is valid, probably need to make a more efficient way to do this in the future
  do {
    accountNumber = generateRandomBusinessAccountNumber();
    companyExists = await db
      .collection("Companies")
      .findOne({ "Account Number": accountNumber });
  } while (companyExists);

  values["Account Number"] = accountNumber.toString();
  keys.push("Account Number");
  let response = dictionaryToJson(keys, values);
  let company = await db.collection("Companies").insertOne(response);
  res.send(response);
});

/*
  deletes the company associated to account number
  account number is sent via body
  returns success, or an error message if there is anything invalid or if the account number does not exist
*/
companies_router.delete("/api/companies/deleteCompany", async (req, res) => {
  let accountNumber = req.body["Account Number"];
  // input validation, making sure that the account number fits the criteria for a business account
  if (typeof accountNumber !== "string" || accountNumber.length === 10) {
    res.send("Invalid account number");
    return;
  }
  let company = await db
    .collection("Companies")
    .findOne({ "Account Number": accountNumber });
  if (company === null) {
    res.send("Company not found");
    return;
  }
  db.collection("Companies").deleteOne(
    { "Account Number": company["Account Number"] },
    { justOne: true }
  );
  res.send(company);
});

// make any new endpoints here (e.g /api/companies):
companies_router.get("/api/companies", async (req, res) => {
  // return all documents from the companies mongodb collection:
  const companies = await db.collection("Companies").find({}).toArray();
  console.log(companies);
  console.log(companies.length);
  res.send(companies);
});

companies_router.get("/api/companies/lazy_load_company", async (req, res) => {
  try {
    // Fetch all documents from the Companies collection with only the Company Name and Account Number fields
    const companies = await db
      .collection("Companies")
      .find({}, { projection: { "Company Name": 1, "Account Number": 1 } })
      .toArray();

    // Map the result to the desired format
    const lazyLoadCompanies = companies.map((company) => ({
      CompanyName: company["Company Name"],
      AccountNumber: company["Account Number"],
    }));

    res
      .status(200)
      .send({ message: "success", lazy_load_companies: lazyLoadCompanies });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ error: "An error occurred while fetching companies." });
  }
});

// gets the company RAG score
companies_router.post("/api/companies/companyScore", async (req, res) => {
  let accountNumbers = req.body.accountNumbers;
  var response = [];
  for (var i = 0; i < accountNumbers.length; i++) {
    const company = await db
      .collection("Companies")
      .findOne({ "Account Number": accountNumbers[i] });
    let ragScore = getRAGScore(company);
    company["RAG"] = ragScore;
    response[company["Account Number"]] = ragScore;
  }
  response = dictionaryToJson(accountNumbers, response);

  res.send(response);
});

companies_router.get(
  "/api/companies/similarCompanies/:accNo",
  async (req, res) => {
    let accountNumber = req.params.accNo;
    const company = await db
      .collection("Companies")
      .findOne({ "Account Number": accountNumber });
    var lowestScore = getRAGScore(company); // because the companies won't get shown if they are not equal or better
    const companies = await db
      .collection("Companies")
      .find({ "Spending Category": company["Spending Category"] })
      .toArray();
    var table = [];
    for (var i = 0; i < companies.length; i++) {
      // if (companies[i]["Account Number"] === company["Account Number"]){
      //   continue;
      // }
      let ragScore = getRAGScore(companies[i]);
      // if (ragScore > lowestScore){
      companies[i]["RAG"] = ragScore;
      console.log(`companies[${companies[i]["Company Name"]}] = ${ragScore}`);
    }
    //sorting them in order...
    for (var i = companies.length - 1; i >= 0; i--) {
      for (var j = 1; j <= i; j++) {
        if ((temp = companies[j - 1]["RAG"] < companies[j]["RAG"])) {
          temp = companies[j - 1];
          companies[j - 1] = companies[j];
          companies[j] = temp;
        }
      }
    }
    var response = {};
    // adding the positioins of each one
    let searchSize = 5;
    let foundOG = false; // flag for if the original company is in the top 5
    if (companies.length < 5) {
      searchSize = companies.length;
    }
    // this is to make sure that the company that they have used is in the top 5 otherwise we need to hunt for it
    for (let i = 0; i <= searchSize - 1; i++) {
      if (companies[i]["Account Number"] === accountNumber) {
        foundOG = true;
      }
      response[companies[i]["Account Number"]] = i + 1;
    }
    // if the company isn't in the top 5 we need to find it's position
    if (foundOG === false) {
      for (let i = 0; i <= companies.length - 1; i++) {
        if (companies[i]["Account Number"] === accountNumber) {
          // then we have found the original company in the request
          response[companies[i]["Account Number"]] = i + 1;
          console.log(
            accountNumber,
            typeof accountNumber,
            response[companies[i]["Account Number"]],
            response["000000001"],
            "companies.length = ",
            companies.length
          );
          break;
        }
      }
    }
    // console.log("GLOBAL LEADERBOARD VVVVVVVVVVVVVVVVV");
    // console.log(companies);
    // console.log("TOP 5 VVVVVVVVVVVVVVVVVVV");
    res.status(200).send(response);
  }
);

module.exports = companies_router;
