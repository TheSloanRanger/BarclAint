const express = require("express");
const { getRAGScore } = require("../common");
const { db } = require("../db");
const transaction_router = express.Router();

const {
  filterByDateSchema,
  companyAddSchema,
} = require("../validation_schemas");


// Endpoint to create a new transaction
transaction_router.post("/api/transactions/create", async (req, res) => {
  const { UserAccountNumber, RecipientAccountNumber, Amount } = req.body;

  console.log(UserAccountNumber);
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

  if (company && !recipient) {
    console.log("Recipient is a company.");

    // Calculate the RAG score of the company
    const ragScore = getRAGScore(company);

    // Update the balance and exp of the user:
    await db
      .collection("Users")
      .updateOne(
        { accountnumber: UserAccountNumber },
        { $inc: { accountbalance: -Amount, UserXP: Amount * ragScore } }
      );

    // Create the transaction
    const transaction = await db.collection("Transactions").insertOne({
      from: UserAccountNumber,
      to: RecipientAccountNumber,
      Time: new Date(),
      amount: Amount,
      ragScore: ragScore,
      type: "Company Transaction",
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
      },
    });
  } else if (recipient && !company) {
    console.log("Recipient is a user.");

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
    });

    res.send({
      message: "Transaction successful",
      transaction: {
        from: UserAccountNumber,
        to: RecipientAccountNumber,
        Time: new Date(),
        amount: Amount,
        type: "User Transaction",
      },
    });
  }
});

//DATE FORMAT STRING -> "YYYY-MM-DD"
transaction_router.post("/api/transactions/filterByDate", async (req, res) => {
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

transaction_router.get("/api/transactions/updateTransactions", async (req, res) => {
  const transactions = await db.collection("Transactions").updateMany({'from' : {$type:1}},[{$set:{'from': { $toString:"$from" } } } ]);
  res.send(transactions);
})

module.exports = transaction_router;
