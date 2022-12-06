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
const { createHash } = require("crypto");
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
		const user = await User.findOne({ token: req.headers.token });
		if (!user) {
			return res.sendStatus(403);
		}
		if (roles.includes(user.role)) {
			return next();
		} else {
			return res.sendStatus(403);
		}
	};
};

//-----------------//
// Create new User //
//-----------------//
app.post("/users", async (req, res) => {
	req.body.password = createHash("sha3-256")
		.update(req.body.password)
		.digest("hex");
	const newUser = req.body;

	const user = new User(newUser);
	await user.save();
	res.send({ message: "New User inserted." });
});

//-----------------//
// Get all Users-- //
//-----------------//
app.get(
	"/users",
	roleMiddleware(["admin", "committee", "finance", "super", "allocator"]),
	async (req, res) => {
		const users = await User.find();
		res.send(users);
	}
);

//-----------------//
// Delete a  User  //
//-----------------//
app.delete(
	"/users/:id",
	roleMiddleware(["admin", "super"]),
	async (req, res) => {
		await User.deleteOne({ _id: ObjectId(req.params.id) });
		res.send({ message: "User removed." });
	}
);

//-----------------//
// Update a  User  //
//-----------------//
app.put("/users/:id", roleMiddleware(["admin", "super"]), async (req, res) => {
	await User.findOneAndUpdate({ _id: ObjectId(req.params.id) }, req.body);
	res.send({ message: "User updated." });
});

//-------------------//
//Verify registration//
//-------------------//

app.post("/verify/registration", async (req, res) => {
	const user = req.body;
	let passed = true;
	const checkLength = (field, str, len) => {
		if ((passed && str === undefined) || (passed && str.length < len)) {
			res.send({
				status: "error",
				title: "Account creation failed",
				message: `${field} must be at least ${len} characters in length.`,
			});
			passed = false;
		}
	};
	const checkNums = (field, str) => {
		if (passed && !/\d/.test(str)) {
			res.send({
				status: "error",
				title: "Account creation failed",
				message: `${field} must contain at least 1 symbol.`,
			});
			passed = false;
		}
	};
	checkLength("Username", user.username, 5);
	checkNums("Username", user.username);
	checkLength("Password", user.password, 6);
	checkNums("Password", user.password);
	if (passed) {
		res.send({
			status: "success",
			title: "Account Created",
			message: "Account creation was successful, you can now login.",
		});
	}
});

//-----------------//
//Check user exists//
//-----------------//
app.get("/users/isavailable/:username", async (req, res) => {
	const user = await User.findOne({ username: req.params.username });
	res.send(!user);
});

//-----------------//
//Check user exists//
//-----------------//
app.get("/users/isAvailable/:username", async (req, res) => {
	const user = await User.findOne({ username: req.params.username });
	res.send(!user);
});

//-----------------//
//Get user from ID //
//-----------------//
app.get(
	"/users/:id",
	roleMiddleware(["finance", "committee", "admin", "super", "allocator"]),
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
	req.body.password = createHash("sha3-256")
		.update(req.body.password)
		.digest("hex");
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
//Get Booking by token       //
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
	"/bookings/filter/:status",
	roleMiddleware(["admin", "committee", "finance", "allocator", "super"]),
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
	roleMiddleware(["committee", "admin", "finance", "allocator", "super"]),
	async (req, res) => {
		res.send(await Stall.find());
	}
);

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
app.delete(
	"/bookings/:id",
	roleMiddleware(["admin", "super"]),
	async (req, res) => {
		await Stall.deleteOne({ _id: ObjectId(req.params.id) });
		res.send({ message: "Stall removed." });
	}
);

//---------------------------//
//See mix of stall types-----//
//---------------------------//
app.get(
	"/proportions",
	roleMiddleware(["committee", "admin", "super", "allocator", "finance"]),
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
	"/assigned",
	roleMiddleware(["committee", "admin", "super", "allocator", "finance"]),
	async (req, res) => {
		let stalls = await Stall.find();
		let allocatedStalls = stalls.filter(
			(stall) => stall.pitchNo && stall.pitchNo !== "-1"
		);
		res.send({ "allocated stalls": allocatedStalls.length });
	}
);

//------------------//
// Get pitchNo list //
//------------------//

app.get(
	"/bookings/list/pitchnumbers",
	roleMiddleware(["super", "admin", "allocator"]),
	async (req, res) => {
		let stalls = await Stall.find();
		res.send(
			stalls
				.filter((stall) => stall.pitchNo && stall.pitchNo !== "-1")
				.map((item) => item.pitchNo)
		);
	}
);

//-----------------//
// Check PitchNo.  //
//-----------------//
app.get(
	"/pitchno/:pitchno",
	roleMiddleware(["allocator", "admin", "super", "allocator"]),
	async (req, res) => {
		let exists = await Stall.findOne({ pitchNo: req.params.pitchno });
		res.send(exists ? "true" : "false");
	}
);

app.get("/test/:test", async (req, res) => {
	let out = createHash("sha3-256").update(req.params.test).digest("hex");
	res.send(out);
});

// Mongoose interacts with the DB
var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function callback() {
	console.log("Database connected!");
});
