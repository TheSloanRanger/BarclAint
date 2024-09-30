require("dotenv").config();
const express = require("express");
const cors = require("cors");

const transaction_router = require("./routes/transactions");
const companies_router = require("./routes/companies");
const users_router = require("./routes/users");
const rewards_router = require("./routes/rewards");

const app = express();
app.use(express.json());
app.use(cors());



// connecting to mongoDB database using mongoose
mongoose
  .connect(uri)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
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

// this is a basic root path
app.get("/", (req, res) => {
  console.log("Hello World");
  res.send("Hello World");
});

// listening to the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
