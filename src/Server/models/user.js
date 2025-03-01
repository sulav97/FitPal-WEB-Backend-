const mongoose = require("mongoose");
mongoose.set('debug', true);
require('../db'); // This ensures your DB connection is established
// Rest of your server setup

const jwt = require("jsonwebtoken");
const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity");
const token = require("./token");
const CaloricValue = require("./CaloricValue");
require('dotenv').config();
const JWTPRIVATEKEY= "nUnhO+b/IJ2viBa/dbaFlBMmwkcUht99s/Hn681YqVY="
const userSchema = new mongoose.Schema({
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
    nickName: {type: String, required: true},
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	verified: { type: Boolean, default: false },
	disabled: { type: Boolean, default: false },
	workouts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Workout' }],
	calories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Calories' }],
	CaloricValue: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CaloricValue' }],
});

userSchema.methods.generateAuthToken = function () {
	const token = jwt.sign({ _id: this._id}, JWTPRIVATEKEY, {
		expiresIn: "7d",
		
	});
	return token;
};


const User = mongoose.model("users", userSchema);

const validate = (data) => {
	const schema = Joi.object({
		firstName: Joi.string().required().label("First Name"),
		lastName: Joi.string().required().label("Last Name"),
        nickName: Joi.string().required().label("Nick Name"),
		email: Joi.string().email().required().label("Email"),
		password: passwordComplexity().required().label("Password"),
	});
	return schema.validate(data);
};


module.exports = {User, validate};