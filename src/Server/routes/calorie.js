const express = require('express');
const { User } = require('../models/user');
const CalorieData = require('../models/calorielog');
const calorie_Maintenance = require('../models/CaloricValue')
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');
const router = express.Router();

const envPath = path.resolve(__dirname,'../utils/.env');
console.log("dotenv")
dotenv.config({ path: envPath });
// Log a new CalorieData


router.post('/logcalories', async (req, res) => {
  const { email, calories, protein, carbohydrates, fats, localDate } = req.body;

  try {
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(404).send('User not found');
      }

      // No need to convert localDate again; it's already in UTC
      const newlog = new CalorieData({
          calories,
          protein,
          carbohydrates,
          fats,
          date: localDate, // Store the adjusted UTC date directly
          user: user._id
      });

      await newlog.save();
      user.calories.push(newlog._id);
      await user.save();

      res.status(201).send('Calories logged');
  } catch (error) {
      res.status(400).send(error.message);
  }
});


router.get('/user/:email/calories', async (req, res) => {
  const { email } = req.params;

  try {
      const user = await User.findOne({ email }).populate('calories');
      if (!user) {
          return res.status(404).send('User not found');
      }

      // Adjust the dates to the local time zone before sending them to the client
      const adjustedCalories = user.calories.map(log => {
          const utcDate = new Date(log.date);
          // Convert UTC date to local date
          const localDate = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
          return {
              ...log._doc, // Spread the original log object
              date: localDate, // Replace the date with the adjusted local date
          };
      });

      res.status(200).json(adjustedCalories);
  } catch (error) {
      res.status(400).send(error.message);
  }
});

router.delete('/logcalories/:id', async (req, res) => {
  const { id } = req.params;

  try {
      const log = await CalorieData.findById(id);
      if (!log) {
          return res.status(404).send('Calorie log not found');
      }

      // Find the associated user
      const user = await User.findById(log.user);
      if (!user) {
          return res.status(404).send('User not found');
      }

      // Remove the log ID from the user's calories array
      user.calories = user.calories.filter(logId => logId.toString() !== id);

      // Save the user after removing the reference
      await user.save();

      // Delete the calorie log
      await CalorieData.deleteOne({ _id: id });

      res.status(200).send('Calorie log deleted successfully');
  } catch (error) {
      res.status(400).send(error.message);
  }
});

router.get('/macros', async (req, res) => {
  const { query, servings = 1 } = req.query; // Default to 1 serving if not specified

  if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
      console.log(`Received request for item: ${query}`);

      // Search for the food item
      const searchResponse = await axios.get(
          `https://api.nal.usda.gov/fdc/v1/foods/search?query=${query}&api_key=j07UkMdpgefCeoneKv36ShPbIy1KCJZc039RFH1T`
      );

      if (searchResponse.data.foods.length === 0) {
          return res.status(404).json({ error: 'No food item found' });
      }

      // Get the food ID of the first search result
      const foodId = searchResponse.data.foods[0].fdcId;

      // Get detailed information about the food item
      const foodResponse = await axios.get(
          `https://api.nal.usda.gov/fdc/v1/food/${foodId}?api_key=j07UkMdpgefCeoneKv36ShPbIy1KCJZc039RFH1T`
      );

      const nutrients = foodResponse.data.foodNutrients;

      // Extract macronutrients and calories, then adjust based on servings
      const macros = {
          item: foodResponse.data.description,
          carbohydrates: (nutrients.find(nutrient => nutrient.nutrient.name === 'Carbohydrate, by difference')?.amount || 0) * servings,
          fats: (nutrients.find(nutrient => nutrient.nutrient.name === 'Total lipid (fat)')?.amount || 0) * servings,
          proteins: (nutrients.find(nutrient => nutrient.nutrient.name === 'Protein')?.amount || 0) * servings,
          calories: (nutrients.find(nutrient => nutrient.nutrient.name === 'Energy')?.amount || 0) * servings,
      };

      res.json(macros);
  } catch (error) {
      console.error('Error occurred:', error);
      res.status(500).json({ error: 'An error occurred while fetching macro information' });
  }
});

// Log a searched food item directly to the user's calorie log
router.post('/macros/log', async (req, res) => {
  const { email, item, calories, protein, carbohydrates, fats, date, servings = 1 } = req.body;

  try {
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(404).send('User not found');
      }

      // Adjust based on servings
      const newlog = new CalorieData({
          item,
          calories: calories * servings,
          protein: protein * servings,
          carbohydrates: carbohydrates * servings,
          fats: fats * servings,
          date,
          user: user._id
      });

      await newlog.save();
      user.calories.push(newlog._id);
      await user.save();

      res.status(201).send('Food item logged successfully');
  } catch (error) {
      res.status(400).send(error.message);
  }
});


router.get('/user/:email/remaining-calories', async (req, res) => {
  const { email } = req.params;

  try {
      const user = await User.findOne({ email }).populate('CaloricValue');
      if (!user) {
          return res.status(404).send('User not found');
      }

      // Fetch the stored daily caloric intake
      const caloricValue = await calorie_Maintenance.findOne({ email });
      if (!caloricValue || caloricValue.dailyCalories == null || caloricValue.caloricMaintenance == null) {
          return res.status(404).json({ msg: 'Daily caloric intake not found. Please store the daily caloric value first.' });
      }

      // Calculate total logged calories and macros
      const totalLoggedCalories = user.calories.reduce((total, log) => total + log.calories, 0);
      const totalLoggedProtein = user.calories.reduce((total, log) => total + log.protein, 0);
      const totalLoggedCarbs = user.calories.reduce((total, log) => total + log.carbohydrates, 0);
      const totalLoggedFats = user.calories.reduce((total, log) => total + log.fats, 0);

      // Calculate remaining calories and macros
      const remainingCalories = caloricValue.caloricDaily - totalLoggedCalories;
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
