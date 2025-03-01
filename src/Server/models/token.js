require('../db')
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose.set('debug', true);

const tokenSchema = new Schema({
	userId: {
		type: Schema.Types.ObjectId,
		required: true,
		ref: "user",
		unique: true,
	},
	token: { type: String, required: true },
	createdAt: { type: Date, default: Date.now, expires: 3600000000 },
});

module.exports = mongoose.model("tokens", tokenSchema);