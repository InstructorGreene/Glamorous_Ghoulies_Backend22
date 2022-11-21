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
const e = require("express");

const { createStall } = require("./stallRoutes.js");
createStall();

//Connect to MongoDB
mongoose.connect(dburi, { useNewUrlParser: true });

// Instanciate Express server
const app = express();

///// Use statements
// adding Helmet to enhance your API's security
app.use(helmet());
// using bodyParser to parse JSON bodies into JS objects
app.use(bodyParser.json());

-app.use(express.urlencoded({ extended: false }));

// enabling CORS for all requests
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
		const user = await User.findOne({ _id: ObjectId(req.headers.id) });
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
app.post("/users/", async (req, res) => {
	const newUser = req.body;
	const user = new User(newUser);
	await user.save();
	res.send({ message: "New User inserted." });
});

// app.post("/testUser", async (req, res) => {
// 	const user = new User({
// 		// called adSchema, that takes in an object (hence the { opening)
// 		username: "testUserAdmin",
// 		email: "admin@admin",
// 		password: "adminPass",
// 		token: "12345",
// 		role: "admin",
// 	});
// 	await user.save();
// 	res.send({ message: "New User inserted." });
// });
// anything after this, is protected by the following middleware

//-----------------//
// Get all Users-- //
//-----------------//
app.get(
	"/users/",
	roleMiddleware(["admin", "committee", "finance"]),
	async (req, res) => {
		res.send(await User.find());
	}
);

//-----------------//
// Delete a  User  //
//-----------------//
app.delete("/users/:id", roleMiddleware(["admin"]), async (req, res) => {
	await User.deleteOne({ _id: ObjectId(req.params.id) });
	res.send({ message: "User removed." });
});

//-----------------//
// Update a  User  //
//-----------------//
app.put("/users/:id", roleMiddleware(["admin"]), async (req, res) => {
	await User.findOneAndUpdate({ _id: ObjectId(req.params.id) }, req.body);
	res.send({ message: "User updated." });
});

//-----------------//
//Get user from ID //
//-----------------//
app.get(
	"/users/:id",
	roleMiddleware(["finance", "committee", "admin"]),
	async (req, res) => {
		const user = await User.findOne({ _id: ObjectId(req.params.id) });
		if (!user) {
			return res.sendStatus(404);
		}
		res.send(user);
	}
);

//-----------------//
//Get user from tk //
//-----------------//
app.get("/token/:token", async (req, res) => {
	const user = await User.findOne({ token: req.params.token });
	if (!user) {
		return res.sendStatus(404);
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

//---------------------------//
//Get Current User's Bookings//
//---------------------------//
// Regular accounts should be able to view their own bookings
app.get("/bookings/:token", async (req, res) => {
	const currentUser = await User.findOne({ token: req.params.token });
	res.send(await Stall.find({ userId: ObjectId(currentUser._id) }));
});

//---------------------------//
//Get Bookings by status ----//
//---------------------------//
// Regular accounts should be able to view their own bookings
app.get(
	"/bookings/byStatus/:status",
	roleMiddleware(["admin", "committee", "finance", "allocator"]),
	async (req, res) => {
		res.send(await Stall.find({ status: req.params.status }));
	}
);

//-----------------//
//Create new Stall //
//-----------------//
// Regular accounts/Staff accounts should all be able to create bookings
app.post("/bookings", async (req, res) => {
	const newStall = req.body;
	const stall = new Stall(newStall);
	await stall.save();
	res.send({ message: "New Stall inserted." });
});

//-----------------//
// Get all bookings//
//-----------------//

app.get(
	"/bookings",
	roleMiddleware(["committee", "admin", "finance", "allocator"]),
	async (req, res) => {
		res.send(await Stall.find());
	}
);

//-----------------//
// Update a Stall  //
//-----------------//
app.put(
	"/bookings/:id",
	roleMiddleware(["admin", "finance", "allocator"]),
	async (req, res) => {
		await Stall.findOneAndUpdate({ _id: ObjectId(req.params.id) }, req.body);
		res.send({ message: "Stall updated." });
	}
);

//-----------------//
// Delete a Stall  //
//-----------------//
app.delete("/bookings/:id", roleMiddleware(["admin"]), async (req, res) => {
	await Stall.deleteOne({ _id: ObjectId(req.params.id) });
	res.send({ message: "Stall removed." });
});

//---------------------------//
//See mix of stall types-----//
//---------------------------//
app.get(
	"/proportions",
	roleMiddleware(["committee", "admin"]),
	async (req, res) => {
		const bookingsList = await Stall.find();
		let freqMap = {};
		bookingsList.forEach((item) => {
			if (!freqMap[item.type]) {
				freqMap[item.type] = 0;
			}
			freqMap[item.type] += 1;
		});
		res.send(freqMap);
	}
);

//-----------------//
// Count assigned  //
//-----------------//
app.get(
	"/assigned/",
	roleMiddleware(["committee", "admin"]),
	async (req, res) => {
		let stalls = await Stall.find();
		let allocatedStalls = stalls.filter((stall) => stall.pitchNo != -1);
		res.send({ "allocated stalls": allocatedStalls.length });
	}
);

// Mongoose interacts with the DB
var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function callback() {
	console.log("Database connected!");
});
