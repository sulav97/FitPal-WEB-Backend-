const mongoose = require('mongoose');

// Define the Calories schema
const calorieSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now, required: true },
    calories: {type: Number, required: true},
    protein: {type: Number, required: true},
    carbohydrates: {type: Number, required: true},
    fats: {type: Number, required: true},
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
});

const Calories = mongoose.model('Calories', calorieSchema);

module.exports = Calories;

//(Current Weight, Height, Age, Start Date, End Date)/ Store the Information, Target Weight
// Create two separate pages for Calculation and Calorie Log, take the Chosen Calorie Calculation store it and use it for the daily goal for calories
// Based on the Above information (Calorie Maintenance to reach goal, then the user selects the Fat, Protein, Carbohydrates Percentage for each)