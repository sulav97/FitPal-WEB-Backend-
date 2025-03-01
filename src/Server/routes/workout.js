const express = require('express');
const { User } = require('../models/user');
const { Workout, WorkoutLog, WorkoutCategory, UserWorkoutPlan } = require('../models/workoutlist');

const router = express.Router();

const getUserByEmail = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }
    return user;
};

router.post('/logWorkout', async (req, res) => {
    const { email, exercises, categoryId, workoutId, date } = req.body;

    try {
        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(404).send('User not found');
        }

        const category = await WorkoutCategory.findById(categoryId);
        if (!category) {
            return res.status(404).send('Category not found');
        }

        // Validate and parse the date
        const parsedDate = date ? new Date(date) : new Date();
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).send('Invalid date provided');
        }

        let workout;

        if (workoutId) {
            workout = await Workout.findById(workoutId);
            if (workout) {
                workout.exercises = exercises;
                workout.date = parsedDate; // Use the parsed date
            } else {
                return res.status(404).send('Workout not found');
            }
        } else {
            workout = await Workout.findOne({
                user: user._id,
                category: categoryId,
                date: {
                    $gte: new Date(parsedDate).setHours(0, 0, 0, 0),
                    $lte: new Date(parsedDate).setHours(23, 59, 59, 999)
                },
                'exercises.name': { $in: exercises.map(e => e.name) }
            });

            if (!workout) {
                workout = new Workout({
                    exercises,
                    user: user._id,
                    category: category._id,
                    date: parsedDate // Use the parsed date
                });

                category.workouts.push(workout._id);
            } else {
                workout.exercises = exercises;
            }
        }

        await workout.save();
        await category.save();
        user.workouts.push(workout._id);
        await user.save();

        res.status(201).send('Workout logged successfully');
    } catch (error) {
        res.status(400).send(error.message);
    }
});

router.get('/user/:email/workouts', async (req, res) => {
    const { email } = req.params;
    const { date } = req.query;

    try {
        const startOfDayUTC = new Date(date);
        startOfDayUTC.setUTCHours(0, 0, 0, 0);

        const endOfDayUTC = new Date(date);
        endOfDayUTC.setUTCHours(23, 59, 59, 999);

        const user = await getUserByEmail(email);

        const workouts = await Workout.find({
            user: user._id,
            date: {
                $gte: startOfDayUTC,
                $lte: endOfDayUTC
            }
        });

        res.status(200).json(workouts);
    } catch (error) {
        res.status(400).send(error.message);
    }
});

router.post('/createCategory', async (req, res) => {
    const { name, description, imageUrl, email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send('User not found');
        }

        const newCategory = new WorkoutCategory({ 
            name, 
            description, 
            imageUrl, 
            user: user._id // Associate the category with the user
        });
        await newCategory.save();
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(400).send(error.message);
    }
});

router.get('/workoutCategories', async (req, res) => {
    const { email } = req.query;

    try {
        const user = await getUserByEmail(email);

        const categories = await WorkoutCategory.find({ user: user._id });
        res.status(200).json(categories);
    } catch (error) {
        res.status(400).send(error.message);
    }
});

router.get('/category/:categoryId/workouts', async (req, res) => {
    const { categoryId } = req.params;
    const { email } = req.query;

    try {
        const user = await getUserByEmail(email);

        const workouts = await Workout.find({ category: categoryId, user: user._id });
        res.status(200).json(workouts);
    } catch (error) {
        res.status(400).send(error.message);
    }
});

router.delete('/category/:categoryId', async (req, res) => {
    const { categoryId } = req.params;
    const { email } = req.body; // Assuming the email is sent in the request body

    try {
        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Find the category to delete
        const category = await WorkoutCategory.findOne({ _id: categoryId, user: user._id });
        if (!category) {
            return res.status(404).send('Category not found or does not belong to the user');
        }

        // Delete the category
        await WorkoutCategory.deleteOne({ _id: categoryId, user: user._id });

        res.status(200).send('Category deleted successfully');
    } catch (error) {
        res.status(400).send(error.message);
    }
});

// The DELETE route for workouts should be at the top level
router.delete('/deleteWorkout', async (req, res) => {
    const { workoutId, email } = req.body;
    if (!workoutId || !email) {
        return res.status(400).send('Missing workoutId or email');
    }
    try {
        // Validate that the workout belongs to the user
        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(404).send('User not found');
        }

        const workout = await Workout.findOne({ _id: workoutId, user: user._id });
        if (!workout) {
            return res.status(404).send('Workout not found or not authorized');
        }

        await Workout.deleteOne({ _id: workoutId, user: user._id });
        res.status(200).send('Workout deleted successfully');
    } catch (error) {
        res.status(500).send('Error deleting workout: ' + error.message);
    }
});

module.exports = router;
