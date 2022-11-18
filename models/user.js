const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
	// Create a Schema constructor ( mongoose.Schema() )
	// called adSchema, that takes in an object (hence the { opening)
	username: String,
	email: String,
	password: String,
	token: String,
	// businessName: String,
	// phoneNumber: String,
	// typeOfStall: String,
	// comments: String,
});

module.exports.User = mongoose.model("User", userSchema);
