const express = require("express");
const app = express();
const bcrypt = require("bcrypt");

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

app.use(express.json());
const jwt = require("jsonwebtoken");
const path = require("path");
const dbPath = path.join(__dirname, "twitterClone.db");
let db;
const initializeDbServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server is running at 3000");
    });
  } catch (e) {
    console.log(`error is ${e.message}`);
  }
};
initializeDbServer();
const middlewareToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let Token;
  if (authHeader !== undefined) {
    Token = authHeader.split(" ")[1];
  }
  if (Token === undefined) {
    response.status(400);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(Token, "karthik", async (error, payLoad) => {
      if (error) {
        response.status(400);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const userCheckQuery = `select * from user where username='${username}';`;
  const hashedPassword = await bcrypt.hash(password, 10);
  const insertQuery = `insert into user (username,password,name,gender) values(
        '${username}','${password}','${name}','${gender}');`;
  const result = await db.get(userCheckQuery);
  if (result !== undefined) {
    response.status(400);
    response.send("user already exists");
  } else if (password.length < 6) {
    response.status(400);
    response.send("Password is too short");
  } else {
    response.status(200);
    await db.run(insertQuery);
    response.send("User created successfully");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const userCheckQuery = `select * from user where username='${username}';`;
  const result = await db.get(userCheckQuery);
  const passwordCheck = await bcrypt.compare(password, result.password);
  if (result === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else if (passwordCheck === false) {
    response.status(400);
    response.send("Invalid password");
  } else {
    const jwtToken = jwt.sign(username, "karthik");
    response.send(`{jwtToken:'${jwtToken}'}`);
  }
});

app.get("/user/tweets/feed/", middlewareToken, async (request, response) => {
  const { username } = request;
  const getUserIdQuery = `select user_id from user where username='${username}';`;
  const getUserId = await db.get(getUserIdQuery);
  const getFollowerQuery = `select following_user_id  from follower where follower_user_id='${getUserId}';`;
  const followerId = await db.all(getFollowerQuery);
  const getFollowerIds = followerId.map((eachUser) => {
    return eachUser.following_user_id;
  });
  const getTweetQuery = `select user.username,tweet.tweet,tweet.date_time as dateTime from user inner join tweet 
    on user.user_id=tweet.user_id where user.user_id in ('${getFollowerIds}') order by tweet.date_time desc limit 4;`;
  const responseResult = await db.all(getTweetQuery);
  response.send(responseResult);
});
