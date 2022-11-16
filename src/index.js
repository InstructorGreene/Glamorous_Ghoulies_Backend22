/// Importing the dependencies
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const port = process.env.PORT; // port is now equal to PORT from .env
const dburi = process.env.DBURI; // dburi is now equal to DBURI from .env

// Import those Schemas we just created
const { User } = require("../models/user");

//Connect to MongoDB
mongoose.connect(dburi, { useNewUrlParser: true });

// Instanciate Express server
const app = express();

///// Use statements
// adding Helmet to enhance your API's security
app.use(helmet());
// using bodyParser to parse JSON bodies into JS objects
app.use(bodyParser.json());
// enabling CORS for all requests
app.use(cors());
// adding morgan to log HTTP requests
app.use(morgan("combined"));

app.post("/auth", async (req, res) => {
	const user = await User.findOne({ username: req.body.username });
	if (!user) {
		return res.sendStatus(401);
	}
	if (req.body.password !== user.password) {
		return res.sendStatus(403);
	}
	user.token = uuidv4();
	await user.save();
	res.send({ token: user.token });
});

// Startings the express server
// Waits for requests and handles them accordingly
app.listen(port, () => {
	console.log(`listening on port ${port}`);
});

//-----------------//
// Get all request //
//-----------------//
app.get("/", async (req, res) => {
	res.send(await User.find());
	// Remember User was defined in our 'User.js' Mongoose schema
	// Mongoose is handling communications with the db via .find()
});

//TODO: Add other requests

//-----------------//
// Create new User //
//-----------------//
app.post("/", async (req, res) => {
	const newUser = req.body;
	const user = new User(newUser);
	await user.save();
	res.send({ message: "New User inserted." });
});

//-----------------//
// Delete a  User  //
//-----------------//
app.delete("/:id", async (req, res) => {
	await User.deleteOne({ _id: ObjectId(req.params.id) });
	res.send({ message: "User removed." });
});

//-----------------//
// Update a  User  //
//-----------------//
app.put("/:id", async (req, res) => {
	await User.findOneAndUpdate({ _id: ObjectId(req.params.id) }, req.body);
	res.send({ message: "User updated." });
});

// Mongoose interacts with the DB
var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function callback() {
	console.log("Database connected!");
});
