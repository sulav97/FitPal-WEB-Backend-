const router = require("express").Router();
const { User } = require("../models/user");
const Token = require("../models/token");
const crypto = require("crypto");
const sendEmail = require("../utils/SendEmail");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.resolve(__dirname,'../utils/.env');
console.log("dotenv")
dotenv.config({ path: envPath });
router.post("/", async (req, res) => {
	try {
		const { error } = validate(req.body);
		if (error)
			return res.status(400).send({ message: "Check Verification"  });

		const user = await User.findOne({ email: req.body.email });
		if (!user)
			return res.status(401).send({ message: "Invalid Email or Password" });

		const validPassword = await bcrypt.compare(
			req.body.password,
			user.password
		);
		if (!validPassword)
			return res.status(401).send({ message: "Invalid Email or Password" });
			if (user.disabled) {
				return res.status(403).send({ message: "Account is disabled. Please contact support." });
			}
		if (!user.verified) {
			let token = await Token.findOne({ userId: user._id });

			if (!token) {
				token = await new Token({
					userId: user._id,
					token: crypto.randomBytes(32).toString("hex"),
				}).save();
				const url = `${process.env.BASE_URL}/api/users/${user.id}/verify/${token.token}`.replace(/([^:]\/)\/+/g, "$1");
				await sendEmail(user.email, "Verify Email", url);
			}
			user.verified = false;
		} else {
			user.verified = true;
		}

		const token = user.generateAuthToken();
		console.log(token);
		console.log(user.isAdmin);

		res.status(200).send({ data: token, message: "logged in successfully", isAdmin: user.isAdmin, verified:user.verified});
	} catch (error) {
		res.status(500).send({ message: "Internal Server Error" });
	}
});

// Route to resend verification email
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        if (user.verified) {
            return res.status(400).send({ message: "This account is already verified." });
        }

        let token = await Token.findOne({ userId: user._id });
        if (!token) {
            token = new Token({
                userId: user._id,
                token: crypto.randomBytes(32).toString("hex"),
            });
            await token.save();
        }

        // Send the verification email
        const url = `${process.env.BASE_URL}api/users/${user.id}/verify/${token.token}`;
		console.log("URL: " + url)
        await sendEmail(user.email, "Verify Email", url);

        res.send({ message: "Verification email resent successfully." });
    } catch (error) {
        res.status(500).send({ message: "Internal Server Error" });
    }
});




const validate = (data) => {
	const schema = Joi.object({
		email: Joi.string().email().required().label("Email"),
		password: Joi.string().required().label("Password"),
	});
	return schema.validate(data);
};

module.exports = router;