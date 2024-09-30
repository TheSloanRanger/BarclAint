const express = require("express");
const users_router = express.Router();
const {
  userAddSchema,
  userTransactionSchema,
  userTransactionToSchema,
  userUpdateBalanceSchema,
  UserFindSchema,
} = require("../validation_schemas");
const { db } = require("../db");

// DATE FORMAT STRING -> "YYYY-MM-DD"
// Add rewardId: expiryDate to user:
users_router.post("/api/users/addReward", async (req, res) => {
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
      {
        $push: {
          rewards: { RewardID: RewardID, ExpiryDate: new Date(ExpiryDate) },
        },
      }
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

//Body of request MUST be in the form of:
/*
{ 
  "name" : "XXXXX",
  "age" : "XX",
  "UserBalance" : 500 (any integer)
}
*/
users_router.put("/api/user/add", async (req, res) => {
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

users_router.post("/api/user_transactions", async (req, res) => {
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
      .find({ from: req.body.UserAccountNumber })
      .toArray();
    res.send(transactions);
    console.log("Hello");
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ error: "An error occurred while fetching transactions." });
  }
});

users_router.post("/api/user_transactions/to", async (req, res) => {
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

users_router.post("/api/user_find", async (req, res) => {
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
users_router.post("/api/user/update_balance", async (req, res) => {
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

module.exports = users_router;
