require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io")
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});
const Joi = require("joi");

app.use(express.json());
app.use(cors());

const {
  userTransactionSchema,
  userTransactionToSchema,
  createTransactionSchema,
  userUpdateBalanceSchema,
  userAddSchema,
  UserFindSchema,
  filterByDateSchema,
  getCompanySchema,
  companyAddSchema,
  rewardAddSchema,
  getUserRewards
} = require("./validation_schemas");
const { connected } = require("process");

const db = mongoose.connection;

const uri =
  "mongodb+srv://BarclaintGroup:XHfVyF4mkQCPUMTf@freecluster.lfcpx.mongodb.net/Barclaint";

// connecting to mongoDB database using mongoose
mongoose
  .connect(uri)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });



let connectedUsers = new Map();

io.on("connection", (socket) => {
  //log number of users currently connected
  
  socket.on("register_socket", (accountNumber) => {
    connectedUsers.set(accountNumber, socket.id);
    console.log("Number of connected users: " + connectedUsers.size);
    //wait 5 seconds then send the notification
    setTimeout(() => {
      socket.emit("notification", "You are now connected to the server");
    }, 5000);
    //socket.emit("notification", "You are now connected to the server");
    console.log(`User ${accountNumber} connected`);
  });
  
  socket.on("logged_in", (accountNumber) => {
    socket.emit("notification", `You are now logged in ${accountNumber}`);
  })

  socket.on("disconnect", () => {
    for(let [accountNumber, socketId] of connectedUsers){
      if(socketId === socket.id){
        connectedUsers.delete(accountNumber);
        console.log(`User ${accountNumber} disconnected`);
        break;
      }
    }
  });
});







function generateRandomAccountNumber() {
  return Math.floor(10000000000 + Math.random() * 90000000000);
}


function generateRandomBusinessAccountNumber(){
  return Math.floor(100000000 + Math.random() * 900000000);
}

function getRAGScore(company){
  let carbonEmissions = Number(company["Carbon Emissions"]);
  let wasteManagement = Number(company["Waste Management"]);
  let sustainabilityPractices = Number(company["Sustainability Practices"]);
  let ragScore = `${(carbonEmissions+wasteManagement+sustainabilityPractices)/(30)}`;

  return parseFloat(ragScore);
}

/*
my own version of pythons json.dumps() as I could not find an alternative to this on json
*/
function dictionaryToJson(selectedKeys, updateTable){
  let response = "{";
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
  return response;
}


async function calculateGameification(UserAccountNumber){

  const BASE_XP = 5; 
  const MULTIPLIER = 1.5;

  const user = await db
        .collection("Users")
        .findOne({ accountnumber: UserAccountNumber });

  function getXPForLevel(level) {
    const baseLevel = level % 10 || 10; // Levels repeat every 10 levels
    return Math.floor(BASE_XP * MULTIPLIER ** (baseLevel - 1)); // Multiply XP by power of multiplier

  }

  function useCalculateLevel(user) {
    let level = 1, xpForNextLevel = getXPForLevel(level), xpAccumulated = 0;

    while (user.UserXP >= xpAccumulated + xpForNextLevel) {
      xpAccumulated += xpForNextLevel;
      xpForNextLevel = getXPForLevel(++level);
    }

    return { level};
  }

  if((useCalculateLevel().level % 10) === 0){
    io.to(connectedUsers.get(UserAccountNumber)).emit("notification", "New Reward");

  }
}


// this is a basic root path
app.get("/", (req, res) => {
  console.log("Hello World");
  res.send("Hello World");
});

app.get("/api/socketOpen", async (req, res) => {

});

// make any new endpoints here (e.g /api/companies):
app.get("/api/companies", async (req, res) => {
  // return all documents from the companies mongodb collection:
  const companies = await db.collection("Companies").find({}).toArray();
  res.send(companies);
});

app.get("/api/companies/lazy_load_company", async (req, res) => {
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
app.post("/api/companies/getCompany", async (req, res) => {
  const accountNumber = req.body["Account Number"];
  const {error} = getCompanySchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }
  if(accountNumber.length !== 9){
    res.send("Invalid Account Number");
    return
  }else{
    let company = await db.collection("Companies").findOne({"Account Number": accountNumber});
    if(company === null){
      res.send("Account not found");
      return;
    }
    res.send(company);
  }
});

function getRAGScore(company) {
  let carbonEmissions = Number(company["Carbon Emissions"]);
  let wasteManagement = Number(company["Waste Management"]);
  let sustainabilityPractices = Number(company["Sustainability Practices"]);
  let ragScore = `${
    (carbonEmissions + wasteManagement + sustainabilityPractices) / 30
  }`;
  return parseFloat(ragScore);
}

// gets the company RAG score
app.post("/api/companies/companyScore", async (req, res) => {
  let accountNumbers = req.body.accountNumbers;
  var response = [];
  for(var i = 0; i<accountNumbers.length; i++){
      const company = await db.collection("Companies").findOne({"Account Number": accountNumbers[i]});
      let ragScore = getRAGScore(company);
      company["RAG"] = ragScore;
      response[company["Account Number"]] = ragScore;
  }
  response = dictionaryToJson(accountNumbers, response);

  res.send(response);
});

app.get("/api/companies/similarCompanies/:accNo", async (req, res) => {
  let accountNumber = req.params.accNo;
  const company = await db.collection("Companies").findOne({"Account Number": accountNumber});
  var lowestScore = getRAGScore(company); // because the companies won't get shown if they are not equal or better
  const companies = await db.collection("Companies").find({"Spending Category": company["Spending Category"]}).toArray();
  var table = [];
  for(var i=0; i < companies.length; i++){
    // if (companies[i]["Account Number"] === company["Account Number"]){
    //   continue;
    // }
    let ragScore = getRAGScore(companies[i]);
    // if (ragScore > lowestScore){
    companies[i]["RAG"] = ragScore;
    console.log(`companies[${companies[i]["Company Name"]}] = ${ragScore}`)
  }
  //sorting them in order...
  for(var i = companies.length-1; i>=0; i--){
    for(var j = 1; j <= i; j++){
      if (temp = companies[j-1]["RAG"] < companies[j]["RAG"]) {
        temp = companies[j-1];
        companies[j-1] = companies[j];
        companies[j] = temp; 
      }
    }
  }
  var response = {};
  // adding the positioins of each one
  let searchSize = 5;
  let foundOG = false // flag for if the original company is in the top 5
  if(companies.length<5){
    searchSize = companies.length;
  }
  // this is to make sure that the company that they have used is in the top 5 otherwise we need to hunt for it
  for(let i = 0; i<=searchSize-1; i++){
    if(companies[i]["Account Number"] === accountNumber){
      foundOG = true;
    }
    response[companies[i]["Account Number"]] = i+1;
  }
  // if the company isn't in the top 5 we need to find it's position
  if(foundOG === false){
    for(let i=0;i <= companies.length-1; i++){
      if(companies[i]["Account Number"]===accountNumber){
        // then we have found the original company in the request
        response[companies[i]["Account Number"]] = i+1;
        console.log(accountNumber, typeof accountNumber, response[companies[i]["Account Number"]], response["000000001"], "companies.length = ", companies.length);
        break;
      }
    }
  }
  // console.log("GLOBAL LEADERBOARD VVVVVVVVVVVVVVVVV");
  // console.log(companies);
  // console.log("TOP 5 VVVVVVVVVVVVVVVVVVV");
  res.status(200).send(response);
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
});

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
app.post("/api/companies/addCompany", async (req, res) => {
  let keys = ["Company Name", "Spending Category", "Carbon Emissions", "Waste Management", "Sustainability Practices", "Summary"];
  let values = []; // the dictionary is going to get stored here with the body values once it has all been validated
  const {error} = companyAddSchema.validate(req.body);// CANT FIGURE OUT HOW TO WORK ASK JAKE TMRW
  if (error) {
    return res.status(400).send(error.details[0].message);
  }
  for(let i=0; i<keys.length;i++){
    // since these are purely strings and won't require numerical operations, just making sure that they are getting filled
    if(keys[i] === "Company Name" || keys[i] === "Spending Category" || keys[i] === "Summary"){
      let temp = req.body[keys[i]];
      //typeof temp !== 'string' || was inside, but removed for now while i test Joi
      if(typeof temp !== 'string' || temp.length < 1){
        res.send(`Invalid ${keys[i]}`);
        return;
      }
      values[keys[i]] = temp;
    }else if(keys[i] === "Carbon Emissions" || keys[i] === "Waste Management" || keys[i] === "Sustainability Practices"){
      // this method also accepts decimals, it will just truncate anything after the . ex: 9.9 turns into 9
      // for example, 1.1 turns into 1,
      let temp = parseInt(req.body[keys[i]]);
      if(isNaN(temp)|| temp < 0 || temp > 10){
        res.send(`Invalid ${keys[i]}`);
        return;
      }
      values[keys[i]] = temp.toString();
    }
  }
  //https://stackoverflow.com/a/65549541
  if(Object.keys(keys).length !== Object.keys(values).length){ //tempory solution until i get joi working
    res.send("Required fields missing");
    return;
  }

  let accountNumber;
  let companyExists;
  // loop makes sure that the account number is valid, probably need to make a more efficient way to do this in the future
  do {
    accountNumber = generateRandomBusinessAccountNumber();
    companyExists = await db.collection("Companies").findOne({"Account Number" : accountNumber});
  } while(companyExists);

  values['Account Number'] = accountNumber.toString()
  keys.push('Account Number');
  let response = dictionaryToJson(keys, values);
  let company = await db.collection("Companies").insertOne(response);
  res.send(response); 
});

/*
  deletes the company associated to account number
  account number is sent via body
  returns success, or an error message if there is anything invalid or if the account number does not exist
*/
app.delete("/api/companies/deleteCompany", async (req, res) => {
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

app.post("/api/user_transactions", async (req, res) => {
  // Validate the request body

  try {
    const { error } = userTransactionSchema.validate(req.body);
    if (error) {
      return res.status(400).send(error.details[0].message);
    }

    // Return all transactions from a specific user by the UserAccountNumber
    console.log(req.body.UserAccountNumber);
    const transactions = await db
      .collection("Transactions")
      .find( {$or : [ { from: req.body.UserAccountNumber } , { to: req.body.UserAccountNumber } ] } )
      .toArray();
    res.send(transactions);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ error: "An error occurred while fetching transactions." });
  }
});

app.post("/api/user_transactions/to", async (req, res) => {
  // Validate the request body
  const { error } = userTransactionToSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

  // Return all transactions from a specific company by the Company Account Number
  const transactions = await db
    .collection("Transactions")
    .find({
      to: req.body.CompanyAccountNumber,
      from: req.body.UserAccountNumber,
    })
    .toArray();
  res.send(transactions);
});

app.post("/api/user_find", async (req, res) => {
  const { error } = UserFindSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

  const user = await db
    .collection("Users")
    .find({ accountnumber: req.body.UserAccountNumber })
    .toArray();
  res.send(user);
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
  const { error } = userUpdateBalanceSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

  // Update the balance of a user by the User Account Number
  const user = await db
    .collection("Users")
    .updateOne(
      { accountnumber: req.body.UserAccountNumber },
      { $inc: { accountbalance: req.body.BalanceDifference } }
    );
  res.send(user);
});

//Body of request MUST be in the form of:
/*
{ 
  "name" : "XXXXX",
  "age" : "XX",
  "UserBalance" : 500 (any integer)
}
*/
app.put("/api/user/add", async (req, res) => {
  // Validate the request body
  const { error } = userAddSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

  // Add a new user to the Users collection
  let accountNumber;
  let userExists;

  do {
    accountNumber = generateRandomAccountNumber();
    userExists = await db
      .collection("Users")
      .findOne({ accountnumber: accountNumber });
  } while (userExists);

  req.body.accountnumber = accountNumber;
  const user = await db.collection("Users").insertOne(req.body);
  res.send(user);
});

//DATE FORMAT STRING -> "YYYY-MM-DD"
app.post("/api/transactions/filterByDate", async (req, res) => {
  const { error } = filterByDateSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

  const { userAccountNumber, startDate, endDate } = req.body;

  try {
    const transactions = await db
      .collection("Transactions")
      .find({
        from: userAccountNumber,
        Time: { $gte: new Date(startDate), $lte: new Date(endDate) },
      })
      .toArray();
    res.send(transactions);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ error: "An error occurred while fetching transactions." });
  }
});

// TRANSACTION ENDPOINTS
// Endpoint to create a new transaction
app.post("/api/transactions/create", async (req, res) => {
  const {error} = createTransactionSchema.validate(req.body);
  const { UserAccountNumber, RecipientAccountNumber, Amount, Reference } = req.body;

  if(UserAccountNumber === RecipientAccountNumber){
    res.status(400).send({ error:"Cannot send money to yourself"});
    return;
  }
  // Check if the user has enough balance
  const user = await db
    .collection("Users")
    .findOne({ accountnumber: UserAccountNumber });

  if (user.accountbalance < Amount) {
    res.status(400).send({ error: "Insufficient balance" });
    return;
  }

  // Check if the company exists
  const company = await db
    .collection("Companies")
    .findOne({ "Account Number": RecipientAccountNumber });

  const recipient = await db
    .collection("Users")
    .findOne({ accountnumber: RecipientAccountNumber });

  //recipient is a company
  if (company && !recipient) {

    // Calculate the RAG score of the company
    const ragScore = getRAGScore(company);

    // Update the balance and exp of the user:
    await db
      .collection("Users")
      .updateOne(
        { accountnumber: UserAccountNumber },
        { $inc: { accountbalance: -Amount, UserXP: Amount * ragScore } }
      );

        //XP CALCULATION WAS CUT FROM HERE

    // Create the transaction
    const transaction = await db.collection("Transactions").insertOne({
      from: UserAccountNumber,
      to: RecipientAccountNumber,
      Time: new Date(),
      amount: Amount,
      ragScore: ragScore,
      type: "Company Transaction",
      'Reference': Reference
    });
    res.send({
      message: "Transaction successful",
      transaction: {
        from: UserAccountNumber,
        to: RecipientAccountNumber,
        Time: new Date(),
        amount: Amount,
        ragScore: ragScore,
        type: "Company Transaction",
        'Reference': Reference
      },
    });

    // Calculate gameifcation after 5 seconds after succesful transaction
    setTimeout(calculateGameification(UserAccountNumber), 5000);
  }
  //recipient is a user
  else if (recipient && !company) {
    // Update the balance and exp of the user:
    await db
      .collection("Users")
      .updateOne(
        { accountnumber: UserAccountNumber },
        { $inc: { accountbalance: -Amount } }
      );

    // Update the balance and exp of the recipient:
    await db
      .collection("Users")
      .updateOne(
        { accountnumber: RecipientAccountNumber },
        { $inc: { accountbalance: Amount } }
      );

    // Create the transaction
    const transaction = await db.collection("Transactions").insertOne({
      from: UserAccountNumber,
      to: RecipientAccountNumber,
      Time: new Date(),
      amount: Amount,
      type: "User Transaction",
      'Reference': Reference
    });

    res.send({
      message: "Transaction successful",
      transaction: {
        from: UserAccountNumber,
        to: RecipientAccountNumber,
        Time: new Date(),
        amount: Amount,
        type: "User Transaction",
        'Reference': Reference
      },
    });

    // Send a notification to the recipient
    io.to(connectedUsers.get(RecipientAccountNumber)).emit("notification", "New Transaction");
  }
});


// Rewards endpoints
app.get("/api/rewards", async (req, res) => {
  try {
    const rewards = await db.collection("Rewards").find({}).toArray();
    res.status(200).send(rewards);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ error: "An error occurred while fetching rewards." });
  }
});

// Add a new reward
app.post("/api/rewards/add", async (req, res) => {
  const { error } = rewardAddSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

  const { Company, VoucherAmount, Description, Awardable } = req.body;

  try {
    //generate rewardID
    let rewardID;
    do {
      rewardID = Math.floor(1000 + Math.random() * 9000);
      awardExists = await db
        .collection("Rewards")
        .findOne({ RewardID: rewardID });
    } while (awardExists);

    const reward = await db.collection("Rewards").insertOne({
      RewardID: rewardID,
      Company: Company,
      VoucherAmount: VoucherAmount,
      Description: Description,
      Awardable: Awardable,
    });

    res
      .status(200)
      .send({ message: "Reward added successfully", reward: reward });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "An error occurred while adding reward." });
  }
});

// get user rewards
app.get("/api/rewards/userRewards", async (req, res) => {
  const {error} = getUserRewards.validate(req.body);
  try{
    const user = await db.collection("Users").findOne({'accountnumber':req.body.UserAccountNumber});
    res.status(200).send(user.rewards);
  }catch (err) {
    console.error(err);
    res.status(500).send({error: "An error occured getting user rewards."});
  }
});

// Delete a reward
app.delete("/api/rewards/delete", async (req, res) => {
  const { RewardID } = req.body;

  try {
    const reward = await db.collection("Rewards").findOne({
      RewardID: RewardID,
    });

    if (!reward) {
      res.status(400).send({ error: "Reward not found" });
      return;
    }

    await db.collection("Rewards").deleteOne({
      RewardID: RewardID,
    });

    res
      .status(200)
      .send({ message: "Reward deleted successfully", reward: reward });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "An error occurred while deleting reward." });
  }
});

// DATE FORMAT STRING -> "YYYY-MM-DD"
// Add rewardId: expiryDate to user:
app.post("/api/users/addReward", async (req, res) => {
  const { UserAccountNumber, RewardID, ExpiryDate } = req.body;

  try {
    const user = await db.collection("Users").findOne({
      accountnumber: UserAccountNumber,
    });

    if (!user) {
      res.status(400).send({ error: "User not found" });
      return;
    }

    const reward = await db.collection("Rewards").findOne({
      RewardID: RewardID,
    });

    if (!reward) {
      res.status(400).send({ error: "Reward not found" });
      return;
    }

    await db.collection("Users").updateOne(
      { accountnumber: UserAccountNumber },
      { $push: { rewards: { RewardID: RewardID, ExpiryDate: new Date(ExpiryDate) } } }
    );

    res.status(200).send({
      message: "Reward added to user successfully",
      user: user,
      reward: reward,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ error: "An error occurred while adding reward to user." });
  }
});

// listening to the server on port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
