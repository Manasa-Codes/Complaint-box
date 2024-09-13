const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const path = require('path');
const app = express();
const bcrypt = require('bcrypt'); // For password hashing

// Database Connection
const url = 'mongodb://localhost:27017/complaintbox';
const dbName = 'complaintbox';
let db;

MongoClient.connect(url)
    .then(client => {
        console.log('Connected to Database');
        db = client.db(dbName);
    })
    .catch(error => console.error('Error connecting to database:', error));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Increment likes for a complaint
app.post('/like/:id', async (req, res) => {
    const complaintId = req.params.id;

    try {
        const objectId = new ObjectId(complaintId);
        console.log('Incrementing likes for complaint ID:', objectId);

        const result = await db.collection('complaints').findOneAndUpdate(
            { _id: objectId },
            { $inc: { likes: 1 } },
            { returnOriginal: 'false' }
        );

        if (!result.value) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        res.json({ likes: result.value.likes });
    } catch (error) {
        console.error('Error updating likes:', error);
        res.status(500).json({ message: 'Error updating likes' });
    }
});



// Page to display the form
app.get('/submit', (req, res) => {
    res.render('submit');
});

// Handle complaint submission
app.post('/submit', async (req, res) => {
    try {
        const { name, email, branch, title, description } = req.body;
        const newComplaint = { name, email, branch, title, description, likes: 0, createdAt: new Date() };
        await db.collection('complaints').insertOne(newComplaint);
        res.redirect('/');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Render login page
app.get('/login', (req, res) => {
    res.render('login');
});

// Handle login submission
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db.collection('users').findOne({ username });
        if (!user) {
            return res.status(400).send('User not found');
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).send('Incorrect password');
        }

        // On successful login, redirect to submit page
        res.redirect('/');
    } catch (error) {
        res.status(500).send('Login error');
    }
});

// Render signup page
app.get('/signup', (req, res) => {
    res.render('signup');
});

// Handle signup submission
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { username, password: hashedPassword };

        await db.collection('users').insertOne(newUser);

        // After successful signup, redirect to login page
        res.redirect('/login');
    } catch (error) {
        res.status(500).send('Signup error');
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
