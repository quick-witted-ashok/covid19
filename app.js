const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convert = (stats) => {
  return {
    stateName: stats.state_name,
  };
};

const convertState = (each) => {
  return {
    stateId: each.state_id,
    stateName: each.state_name,
    population: each.population,
  };
};

const convertDistrict = (movie) => {
  return {
    districtId: movie.district_id,
    districtName: movie.district_name,
    stateId: movie.state_id,
    cases: movie.cases,
    cured: movie.cured,
    active: movie.active,
    deaths: movie.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStateQuery = `
    SELECT
      *
    FROM
      state;`;
  const statesArray = await db.all(getStateQuery);
  response.send(statesArray.map((eachState) => convertState(eachState)));
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const stateQuery = `
    INSERT INTO district (
        district_name,state_id,cases,cured,active,deaths
    )
    VALUES ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  await db.run(stateQuery);
  response.send("District Successfully Added");
});

app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;
  const getState = `
    SELECT * 
    FROM state
    WHERE state_id = ${stateId};`;
  const state = await db.get(getState);
  response.send(convertState(state));
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const getDistrictQuery = `
    SELECT
      *
    FROM
      district
      WHERE district_id = ${districtId};`;
  const moviesArray = await db.get(getDistrictQuery);
  response.send(convertDistrict(moviesArray));
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const updateQuery = `
    UPDATE district
    SET 
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}  
    WHERE district_id = ${districtId};`;

  await db.run(updateQuery);
  response.send("District Details Updated");
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const getDistrictQuery = `
    DELETE FROM 
    district
      WHERE 
      district_id = ${districtId};`;
  await db.run(getDistrictQuery);
  response.send("District Removed");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getQuery = `
    SELECT SUM(cases) ,SUM(cured),SUM(active),SUM(deaths)
    FROM district
    WHERE state_id = ${stateId}
    GROUP BY state_id;`;

  const stats = await db.get(getQuery);
  console.log(stats);

  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActives: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

//district.map((each) => convert(each))

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getState = `
  SELECT state_name
  FROM state
  WHERE state_id = (SELECT state_id 
    FROM district 
    WHERE district_id=${districtId})
    ;`;
  const stateme = await db.all(getState);
  console.log(stateme);
  response.send({
    stateName: stateme["state_name"],
  });
});
module.exports = app;
