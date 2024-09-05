const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const hbs = require('hbs');
const session = require('express-session');
const multer = require('multer');
const mongoose = require('mongoose');
const { Contributor, Investor, Admin, Idea, Sector } = require('./mongodb');

const app = express();
const templatePath = path.join(__dirname, '../templates');

const upload = multer({ dest: 'uploads/' });

hbs.registerHelper('eq', function (a, b, options) {
    if (a === b) {
        return options.fn(this); // This runs the block
    } else {
        return options.inverse(this); // This runs the inverse block
    }
});

// Middleware configuration
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Change to `true` if using HTTPS
}));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Set up Handlebars as the view engine
app.set('view engine', 'hbs');
app.set('views', templatePath);

// Ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Route handlers
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login', { error: req.query.error });
});

app.get('/signup', (req, res) => {
    res.render('signup', { error: req.query.error });
});

app.post('/signup', (req, res) => {
    const { userType } = req.body;

    if (userType === 'contributor') {
        res.redirect('/signup/contributor');
    } else if (userType === 'investor') {
        res.redirect('/signup/investor');
    } else {
        res.redirect('/signup?error=invalidtype');
    }
});

app.get('/signup/contributor', (req, res) => {
    res.render('signup-contributor', { error: req.query.error });
});

app.get('/signup/investor', (req, res) => {
    res.render('signup-investor', { error: req.query.error });
});

app.get('/signup-success', (req, res) => {
    res.render('signup-success');
});

app.post('/signup/contributor', async (req, res) => {
    const { name, password } = req.body;

    try {
        await Contributor.create({ name, password });
        res.redirect('/signup-success');
    } catch (error) {
        console.error('Error during signup:', error);
        res.redirect('/signup/contributor?error=signup');
    }
});

app.post('/signup/investor', upload.single('idProof'), async (req, res) => {
    const { name, mobile, email, company } = req.body;
    const idProof = req.file.path;

    try {
        await Investor.create({ name, mobile, email, company, idProof, isApproved: false });
        res.send('Signup successful. Admin will review your information and assign login credentials.');
    } catch (error) {
        if (error.code === 11000) {
            if (error.keyPattern.name) {
                res.send('An investor with this name already exists. Please choose a different name.');
            } else if (error.keyPattern.email) {
                res.send('An investor with this email already exists. Please use a different email.');
            }
        } else {
            console.error('Error during signup:', error);
            res.send('Error during signup');
        }
    }
});

app.post('/login', async (req, res) => {
    const { name, password } = req.body;

    try {
        let user;
        let userType;

        user = await Admin.findOne({ name });
        if (user) {
            userType = 'Admin';
        } else {
            user = await Contributor.findOne({ name, password });
            if (user) {
                userType = 'Contributor';
            } else {
                user = await Investor.findOne({ name, password });
                if (user) {
                    userType = 'Investor';
                }
            }
        }

        if (user) {
            req.session.userId = user._id;
            switch (userType) {
                case 'Admin':
                    res.redirect('/adminhome');
                    break;
                case 'Contributor':
                    res.redirect('/ideaconhome');
                    break;
                case 'Investor':
                    res.redirect('/investorshome');
                    break;
                default:
                    res.send('Unknown role');
            }
        } else {
            res.redirect('/login?error=wrongpassword');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.send('Error during login');
    }
});

app.get('/home', (req, res) => {
    res.render('home');
});

app.get('/ideaconhome', ensureAuthenticated, (req, res) => {
    res.render('ideaconhome');
});

app.get('/adminhome', ensureAuthenticated, (req, res) => {
    res.render('adminhome');
});

app.get('/investorshome', ensureAuthenticated, async (req, res) => {
    try {
        const ideas = await Idea.find({})
            .populate('contributorId', 'name')
            .populate('sectorId', 'name')
            .exec();

        res.render('investorshome', { ideas });
    } catch (error) {
        console.error('Error fetching ideas for investors:', error);
        res.status(500).send('Error fetching ideas');
    }
});

app.get('/post-idea', ensureAuthenticated, async (req, res) => {
    try {
        const sectors = await Sector.find(); // Fetch sectors for the form
        res.render('post-idea', { sectors });
    } catch (error) {
        console.error('Error fetching sectors:', error);
        res.status(500).send('Error fetching sectors');
    }
});

app.post('/post-idea', ensureAuthenticated, async (req, res) => {
    const { sectorId, problemStatement } = req.body;

    if (!mongoose.Types.ObjectId.isValid(sectorId) || !sectorId) {
        console.error('Invalid Sector ID:', sectorId);
        return res.redirect('/post-idea');
    }

    try {
        const idea = new Idea({
            contributorId: req.session.userId,
            sectorId,
            problemStatement
        });
        await idea.save();
        res.redirect('/my-ideas');
    } catch (err) {
        console.error('Error submitting idea:', err);
        res.redirect('/post-idea');
    }
});

app.get('/my-ideas', ensureAuthenticated, async (req, res) => {
    try {
        const ideas = await Idea.find({ contributorId: req.session.userId })
            .populate('sectorId', 'name')
            .exec();
        res.render('my-ideas', { ideas });
    } catch (error) {
        console.error('Error fetching ideas:', error);
        res.status(500).send('Error fetching ideas');
    }
});

app.get('/edit-idea/:id', ensureAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        const idea = await Idea.findOne({ _id: id, contributorId: req.session.userId })
            .populate('sectorId', 'name');
        if (idea) {
            const sectors = await Sector.find(); // Fetch sectors for the form
            res.render('edit-idea', { idea, sectors });
        } else {
            res.status(404).send('Idea not found or you do not have permission to edit this idea.');
        }
    } catch (error) {
        console.error('Error fetching idea for editing:', error);
        res.status(500).send('Error fetching idea');
    }
});

app.post('/update-idea/:id', ensureAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { sectorId, problemStatement } = req.body;

    try {
        const idea = await Idea.findOne({ _id: id, contributorId: req.session.userId });

        if (idea) {
            idea.sectorId = sectorId;
            idea.problemStatement = problemStatement;

            await idea.save();

            res.send('Idea updated successfully.');
        } else {
            res.status(404).send('Idea not found or you do not have permission to update this idea.');
        }
    } catch (error) {
        console.error('Error during idea update:', error);
        res.status(500).send('Error during idea update');
    }
});

app.post('/delete-idea/:id', ensureAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await Idea.deleteOne({ _id: id, contributorId: req.session.userId });

        if (result.deletedCount > 0) {
            res.send('Idea deleted successfully.');
        } else {
            res.status(404).send('Idea not found or you do not have permission to delete this idea.');
        }
    } catch (error) {
        console.error('Error during idea deletion:', error);
        res.status(500).send('Error during idea deletion');
    }
});

// Admin panel to view investor signups
app.get('/admin/investors', async (req, res) => {
    try {
        const investors = await Investor.find({ credentialsAssigned: false });
        res.render('admin-investors', { investors });
    } catch (err) {
        console.error('Error loading investors:', err);
        res.status(500).send('Error loading investors');
    }
});


// Assign login credentials to investor
app.post('/admin/assign-credentials/:id', async (req, res) => {
    const { id } = req.params;
    const { username, password } = req.body;

    try {
        // Update the investor with assigned credentials
        await Investor.findByIdAndUpdate(id, {
            username,
            password,
            credentialsAssigned: true
        });
        res.redirect('/admin/investors');
    } catch (err) {
        res.status(500).send('Error assigning credentials');
    }
});

// Admin panel to view all investor applications
app.get('/admin/investor-applications', async (req, res) => {
    try {
        const investors = await Investor.find();
        res.render('admin-investors', { investors });
    } catch (error) {
        console.error('Error fetching investors:', error);
        res.status(500).send('Error fetching investor data');
    }
});

app.get('/admin/investor-approvals', async (req, res) => {
    try {
        const investors = await Investor.find();
        res.render('admin-approvals', { investors });
    } catch (error) {
        console.error('Error fetching investors:', error);
        res.status(500).send('Error fetching investor data');
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
