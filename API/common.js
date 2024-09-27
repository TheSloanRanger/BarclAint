function generateRandomAccountNumber() {
  return Math.floor(10000000000 + Math.random() * 90000000000);
}

function generateRandomBusinessAccountNumber() {
  return Math.floor(100000000 + Math.random() * 900000000);
}

function getRAGScore(company) {
  let carbonEmissions = Number(company["Carbon Emissions"]);
  let wasteManagement = Number(company["Waste Management"]);
  let sustainabilityPractices = Number(company["Sustainability Practices"]);
  let ragScore = `${
    (carbonEmissions + wasteManagement + sustainabilityPractices) / 30
  }`;

  return parseFloat(ragScore);
}

/*
  my own version of pythons json.dumps() as I could not find an alternative to this on json
  */
function dictionaryToJson(selectedKeys, updateTable) {
  let response = "{";
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
  return response;
}

module.exports = {
  generateRandomAccountNumber,
  generateRandomBusinessAccountNumber,
  getRAGScore,
  dictionaryToJson,
};
