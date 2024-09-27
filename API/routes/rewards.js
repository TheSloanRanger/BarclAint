const express = require("express");
const rewards_router = express.Router();
const { db } = require("../db");

// Rewards endpoints
rewards_router.get("/api/rewards", async (req, res) => {
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
rewards_router.post("/api/rewards/add", async (req, res) => {
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

// Delete a reward
rewards_router.delete("/api/rewards/delete", async (req, res) => {
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

module.exports = rewards_router;
