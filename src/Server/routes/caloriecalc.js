const express = require('express');
const Profile = require('../models/profile');
const { User } = require('../models/user');
const CaloricValue = require('../models/CaloricValue'); // Corrected the import case
const router = express.Router();
const dayjs = require('dayjs'); // Import dayjs for date calculations
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

function calculateTDEE(age, gender, height, weight, activityLevel) {
    let BMR;
    if (gender === 'Male') {
        BMR = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
        BMR = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    let multiplier;

    if (activityLevel === 'Sedentary') {
        multiplier = 1.2;
    } else if (activityLevel === 'Lightly Active') {
        multiplier = 1.375;
    } else if (activityLevel === 'Moderately Active') {
        multiplier = 1.55;
    } else if (activityLevel === 'Very Active') {
        multiplier = 1.725;
    } else if (activityLevel === 'Super Active') {
        multiplier = 1.9;
    } else {
        throw new Error(`Invalid activity level: ${activityLevel}`);
    }

    return BMR * multiplier;
}

function calculateDailyCalories(calorie_Maintenance, targetWeight, currentWeight, durationInDays) {
    const weightDifference = targetWeight - currentWeight;
    const totalCaloriesChange = weightDifference * 7700; // 1 kg = 7700 calories
    const dailyCaloricAdjustment = totalCaloriesChange / durationInDays;

    return calorie_Maintenance + dailyCaloricAdjustment;
}

function calculateMacroGrams(dailyCalories, fatPercentage, proteinPercentage, carbPercentage) {
    const fatCalories = (dailyCalories * (fatPercentage / 100));
    const proteinCalories = (dailyCalories * (proteinPercentage / 100));
    const carbCalories = (dailyCalories * (carbPercentage / 100));

    const fatGrams = fatCalories / 9;
    const proteinGrams = proteinCalories / 4;
    const carbGrams = carbCalories / 4;

    return { fatGrams, proteinGrams, carbGrams };
}

// Route to calculate TDEE by email
router.get('/calculate/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const profile = await Profile.findOne({ email });
        if (!profile) {
            return res.status(404).json({ msg: 'User profile not found. Please create your profile first.' });
        }

        // Calculate age based on DOB
        const calculateAge = (DOB) => {
            return dayjs().diff(dayjs(DOB), 'year');
        };

        const age = calculateAge(profile.DOB);
        
        // Log the values for debugging
        console.log(`Calculating TDEE for: age=${age}, gender=${profile.Gender}, height=${profile.Height}, weight=${profile.CurrentWeight}, activityLevel=${profile.ActivityLevel}`);
        
        const calorie_Maintenance = calculateTDEE(age, profile.Gender, profile.Height, profile.CurrentWeight, profile.ActivityLevel);
        
        console.log(`Calorie Maintenance: ${calorie_Maintenance}`);
        
        res.json({ calorie_Maintenance });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.get('/calculate-DC/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const { targetWeight, startDate, endDate } = req.query;

        console.log(`Received query params - targetWeight: ${targetWeight}, startDate: ${startDate}, endDate: ${endDate}`);

        if (!targetWeight || !startDate || !endDate) {
            console.log('Missing query parameters');
            return res.status(400).json({ msg: 'Please provide target weight, start date, and end date.' });
        }

        const profile = await Profile.findOne({ email });
        if (!profile) {
            console.log('Profile not found');
            return res.status(404).json({ msg: 'User profile not found. Please create your profile first.' });
        }

        const calculateAge = (DOB) => {
            return dayjs().diff(dayjs(DOB), 'year');
        };

        const age = calculateAge(profile.DOB);
        
        console.log(`Calculating TDEE for: age=${age}, gender=${profile.Gender}, height=${profile.Height}, weight=${profile.CurrentWeight}, activityLevel=${profile.ActivityLevel}`);
        
        const calorie_Maintenance = calculateTDEE(age, profile.Gender, profile.Height, profile.CurrentWeight, profile.ActivityLevel);
        
        console.log(`TDEE calculated: ${calorie_Maintenance}`);
        
        const parsedStartDate = dayjs(startDate, ['YYYY-MM-DD', 'MM/DD/YYYY']);
        const parsedEndDate = dayjs(endDate, ['YYYY-MM-DD', 'MM/DD/YYYY']);

        console.log(`Parsed Dates - Start: ${parsedStartDate.format()}, End: ${parsedEndDate.format()}`);

        const durationInDays = parsedEndDate.diff(parsedStartDate, 'day');

        if (durationInDays <= 0) {
            console.log('End date is before start date');
            return res.status(400).json({ msg: 'End date must be after start date.' });
        }
        
        console.log("Duration in Days: " + durationInDays);
        const dailyCalories = calculateDailyCalories(calorie_Maintenance, parseFloat(targetWeight), profile.CurrentWeight, durationInDays);
        
        console.log(`Daily Calories calculated: ${dailyCalories}`);
        
        res.json({ dailyCalories, calorie_Maintenance });
    } catch (err) {
        console.error('Server Error:', err);
        res.status(500).send('Server Error');
    }
});


router.post('/store-caloric-value', async (req, res) => {
    try {
        const { email, caloricMaintenance, dailyCalories } = req.body;

        if (!email || (caloricMaintenance === undefined && dailyCalories === undefined)) {
            return res.status(400).json({ msg: 'Please provide email and at least one caloric value.' });
        }

        // Determine which fields to update and set the other field to null
        let update = {};
        if (caloricMaintenance !== undefined) {
            update = {
                caloricMaintenance: parseFloat(caloricMaintenance),
                dailyCalories: null, // Set the other field to null
            };
        } else if (dailyCalories !== undefined) {
            update = {
                caloricMaintenance: null, // Set the other field to null
                dailyCalories: parseFloat(dailyCalories),
            };
        }

        // Use findOneAndUpdate to update the existing entry or create it if it doesn't exist
        const caloricValue = await CaloricValue.findOneAndUpdate(
            { email }, // Filter by email
            update,    // Update with the specified values
            { new: true, upsert: true, setDefaultsOnInsert: true } // Return the updated document, create it if it doesn't exist
        );

        console.log({ msg: 'Caloric value stored successfully', caloricValue });
        res.json({ msg: 'Caloric value stored successfully', caloricValue });
    } catch (err) {
        console.error('Error storing caloric value:', err.message);
        res.status(500).send('Server Error');
    }
});



// Route to calculate macronutrient grams based on stored caloric value
router.get('/calculate-macros/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const { fat, protein, carbohydrates, type } = req.query;

        if (!fat || !protein || !carbohydrates || !type) {
            return res.status(400).json({ msg: 'Please provide all macronutrient percentages and type.' });
        }

        const totalPercentage = parseFloat(fat) + parseFloat(protein) + parseFloat(carbohydrates);
        if (totalPercentage !== 100) {
            return res.status(400).json({ msg: 'Macronutrient percentages must sum to 100%.' });
        }

        const caloricValue = await CaloricValue.findOne({ email });
        if (!caloricValue) {
            return res.status(404).json({ msg: 'Caloric value not found. Please calculate it first.' });
        }

        let dailyCalories;
        if (type === 'maintenance') {
            dailyCalories = caloricValue.caloricMaintenance;
        } else if (type === 'daily') {
            dailyCalories = caloricValue.dailyCalories;
        } else {
            return res.status(400).json({ msg: 'Invalid type provided. Use "maintenance" or "daily".' });
        }

        if (!caloricValue) {
            return res.status(400).json({ msg: `${type} calories not found. Please calculate and store the values first.` });
        }

        const { fatGrams, proteinGrams, carbGrams } = calculateMacroGrams(dailyCalories, parseFloat(fat), parseFloat(protein), parseFloat(carbohydrates));

        res.json({ fatGrams, proteinGrams, carbGrams });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST route to store macronutrient values
router.post('/store-macros/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const { fatGrams, proteinGrams, carbGrams } = req.body;

        if (!email || fatGrams === undefined || proteinGrams === undefined || carbGrams === undefined) {
            return res.status(400).json({ msg: 'Please provide email and all macronutrient values.' });
        }

        // Find the existing caloric value entry by email
        const caloricValue = await CaloricValue.findOne({ email });
        if (!caloricValue) {
            return res.status(404).json({ msg: 'Caloric value not found. Please calculate and store the values first.' });
        }

        // Update the caloricValue with the new macronutrient values
        caloricValue.fatGrams = fatGrams;
        caloricValue.proteinGrams = proteinGrams;
        caloricValue.carbGrams = carbGrams;

        // Save the updated caloricValue
        await caloricValue.save();

        res.json({ msg: 'Macronutrient values stored successfully', caloricValue });
    } catch (err) {
        console.error('Error storing macronutrient values:', err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/user/:email/remaining-calories', async (req, res) => {
    const { email } = req.params;
    const { date } = req.query;  // Accept the date as a query parameter

    if (!date) {
        return res.status(400).send('Date is required');
    }

    // Parse the date from the query parameter
    const selectedDate = new Date(date);

    if (isNaN(selectedDate.getTime())) {
        return res.status(400).send('Invalid date format');
    }

    // Normalize the date to the start and end of the day to filter the logs in UTC
    const startOfDay = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate(), 23, 59, 59, 999));

    try {
        // Populate the 'calories' field with logs filtered by date
        const user = await User.findOne({ email }).populate({
            path: 'calories',
            match: {
                date: { $gte: startOfDay, $lte: endOfDay }  // Filter logs by the selected date in UTC
            }
        });

        if (!user) {
            return res.status(404).send('User not found');
        }
        console.log("Start of Day:", startOfDay);
        console.log("End of Day:", endOfDay);
        console.log("Logs:", user.calories);
        
        // Fetch the stored daily caloric intake
        const caloricValue = await CaloricValue.findOne({ email });
        if (!caloricValue || (caloricValue.dailyCalories == null && caloricValue.caloricMaintenance == null)) {
            return res.status(404).json({ msg: 'Daily caloric intake not found. Please store the daily caloric value first.' });
        }

        // Calculate total logged calories and macros
        const totalLoggedCalories = user.calories.reduce((total, log) => total + log.calories, 0);
        const totalLoggedProtein = user.calories.reduce((total, log) => total + log.protein, 0);
        const totalLoggedCarbs = user.calories.reduce((total, log) => total + log.carbohydrates, 0);
        const totalLoggedFats = user.calories.reduce((total, log) => total + log.fats, 0);

        // Determine which value to use for remaining calories
        const baseCalories = caloricValue.caloricMaintenance || caloricValue.dailyCalories;

        // Calculate remaining calories and macros
        const remainingCalories = baseCalories - totalLoggedCalories;
        const remainingProtein = caloricValue.proteinGrams - totalLoggedProtein;
        const remainingCarbs = caloricValue.carbGrams - totalLoggedCarbs;
        const remainingFats = caloricValue.fatGrams - totalLoggedFats;

        res.status(200).json({
            remainingCalories: remainingCalories > 0 ? remainingCalories : 0,
            remainingProtein: remainingProtein > 0 ? remainingProtein : 0,
            remainingCarbs: remainingCarbs > 0 ? remainingCarbs : 0,
            remainingFats: remainingFats > 0 ? remainingFats : 0
        });
    } catch (error) {
        res.status(400).send(error.message);
    }
});





module.exports = router;
