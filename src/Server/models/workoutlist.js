const { date } = require('joi');
const mongoose = require('mongoose');

// Define the Exercise schema for individual exercises in a workout
const exerciseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sets: { type: Number, required: true },
    reps: { type: Number, required: true },
    weight: { type: Number, required: true },
    restTime: { type: Number, required: true },
    currentRepMax: { type: Number, default: false },
});

// Define the Workout schema, which can include multiple exercises
const workoutSchema = new mongoose.Schema({
    exercises: [exerciseSchema], // Array of exercises
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutCategory', required: true }, // Reference to the category
    date: { type: Date, default: Date.now, required: true }
});

// Define the WorkoutCategory schema to organize workouts
const workoutCategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    imageUrl: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workouts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Workout' }]
});

const Exercise = mongoose.model('Exercise', exerciseSchema);
const Workout = mongoose.model('Workout', workoutSchema);
const WorkoutCategory = mongoose.model('WorkoutCategory', workoutCategorySchema);

module.exports = { Exercise, Workout, WorkoutCategory };
