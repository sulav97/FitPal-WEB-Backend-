const mongoose = require('mongoose');

// Define the CaloricValue schema
const caloricValueSchema = new mongoose.Schema({
    email: { type: String, required: true },
    caloricMaintenance: { type: Number}, // Not required because it can be dailyCalories instead
    dailyCalories: { type: Number}, // Not required because it can be caloricMaintenance instead
    fatGrams: {type: Number},
    proteinGrams: {type: Number},
    carbGrams: {type: Number}

});

const CaloricValue = mongoose.model('CaloricValue', caloricValueSchema);

module.exports = CaloricValue;
