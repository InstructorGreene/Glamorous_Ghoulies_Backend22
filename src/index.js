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
const { Stall } = require("../models/stall");

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
-app.use(express.urlencoded({ extended: false }));
app.use(
	cors({
		origin: [
			"https://stannington-carnival-frontend.onrender.com",
			"http://localhost:3000",
		],
	})
);
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

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // Users // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

const roleMiddleware = (roles) => {
	return async (req, res, next) => {
		const user = await User.findOne({ token: req.headers.token });
		if (roles.includes(user.role)) {
			return next();
		} else {
			console.log("arrived");
			return res.sendStatus(403);
		}
	};
};

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

//-----------------//
//Get user from ID //
//-----------------//

app.get("/:id", async (req, res) => {
	const user = await User.findOne({ _id: ObjectId(req.params.id) });
	if (!user) {
		return res.sendStatus(401);
	}
	res.send(user);
});

//-----------------//
//Get user from tk //
//-----------------//

app.get("/token/:token", async (req, res) => {
	const user = await User.findOne({ token: req.params.token });
	if (!user) {
		return res.sendStatus(401);
	}
	res.send(user);
});

//-----------------//
//Auth login User  //
//-----------------//
app.post("/auth", async (req, res) => {
	// Auth login function
	const user = await User.findOne({ username: req.body.username });
	if (!user) {
		// Username not found in DB
		return res.sendStatus(401);
	}
	if (req.body.password !== user.password) {
		// Password not matching
		return res.sendStatus(403);
	}
	// Set unique token
	user.token = uuidv4();
	// Update changes to user in the db (to save the new token)
	await user.save();
	// TODO: come back to me
	res.send({ token: user.token });
});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // Stalls // // // // // // // // // // // // // // /
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

//-----------------//
// Get all ------- //
//-----------------//
app.get("/bookings", async (req, res) => {
	res.send(await Stall.find());
});

//-----------------//
//Create new Stall //
//-----------------//
app.post("/bookings", async (req, res) => {
	const newStall = req.body;
	const stall = new Stall(newStall);
	await stall.save();
	res.send({ message: "New Stall inserted." });
});

//-----------------//
// Delete a Stall  //
//-----------------//
app.delete("/bookings/:id", async (req, res) => {
	await Stall.deleteOne({ _id: ObjectId(req.params.id) });
	res.send({ message: "Stall removed." });
});

//-----------------//
// Update a Stall  //
//-----------------//
app.put("/bookings/:id", async (req, res) => {
	await Stall.findOneAndUpdate({ _id: ObjectId(req.params.id) }, req.body);
	res.send({ message: "Stall updated." });
});

//-----------------//
// Delete a Stall  //
//-----------------//
app.delete("/bookings/:id", async (req, res) => {
	await Stall.deleteOne({ _id: ObjectId(req.params.id) });
	res.send({ message: "Stall removed." });
});

// Mongoose interacts with the DB
var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function callback() {
	console.log("Database connected!");
});
