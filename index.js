const express = require("express");
const dotenv = require("dotenv");
const mongoose = require('mongoose');
const userModel=require('./userSchmea/userschema') // Corrected spelling: 'userschema'
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing

//otp
const bodyParser = require('body-parser');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');

let otpStore = {};  

dotenv.config();


const port = process.env.PORT || 3000;
const app = express();



// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connection is successfully established"))
    .catch(err => console.log("Not connected successfully. Please try again", err));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

//used to create a store
const store = new MongoDBStore({ 
    uri: process.env.MONGO_URI,
    collection: 'sessions',
});

// Middleware for session management  create in the db
app.use(session({
    secret: process.env.SECRET_KEY,
    store: store,
    resave: false,
    saveUninitialized: false,
}));


// Render login page
app.get('/', (req, res) => {
    res.render('login');
});

// Render registration page
app.get('/register', (req, res) => {
    res.render('register');
});

// Handle user registration
app.post('/register', async (req, res) => {
    console.log(req.body);
    const { username, email, password } = req.body;

    try {
        // Check if the user already exists
        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            console.log("User already exists");
            return res.redirect('/login');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const adduser = new userModel({
            username: username,
            email: email,
            password: hashedPassword, // Use the hashed password
        });

        await adduser.save();
        res.redirect('/login'); // Redirect to login after successful registration

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
});

// Render login page
app.get('/login', (req, res) => {
    res.render('login');
});

// Handle user login
app.post('/login', async (req, res) => {
    console.log(req.body);
    const { email, password } = req.body;
    
    const user = await userModel.findOne({ email });
    if (!user) {
        return res.send("Incorrect email. Please enter a valid email or register yourself before login.");
    }

    // Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
        req.session.userId = user._id; // Store user ID in session
        return res.redirect('/todo'); // Redirect to todo page on successful login
    } else {
        return res.send("Incorrect password.");
    }
});

// Render todo page (only accessible after login)
app.get('/todo', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login'); // Redirect to login if not authenticated
    }
    return res.render('todo');
});


//otp


// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
