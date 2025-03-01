const mongoose = require('mongoose');

// Define the Profile schema
const profileSchema = new mongoose.Schema({
    email: { type: String, ref: 'User', required: true, unique: true },
    DOB: { type: Date, required: false },
    Gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    Height: { type: Number, required: true }, // in cm
    CurrentWeight: { type: Number, required: true }, // in kg
    ActivityLevel: { type: String, enum: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Super Active'], required: true },
    CreatedAt: { type: Date, default: Date.now },
    UpdatedAt: { type: Date, default: Date.now }
});

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
