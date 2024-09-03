const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const hbs = require('hbs');
const session = require('express-session');
const multer = require('multer');
const { Contributor, Investor, Admin, Idea, Sector } = require('./mongodb');

const app = express();
const templatepath = path.join(__dirname, '../templates');

const upload = multer({ dest: 'uploads/' });

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.set('view engine', 'hbs');
app.set('views', templatepath);

const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

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
        await Investor.create({ name, mobile, email, company, idProof });
        res.send('Signup successful. Admin will share your credentials through email.');
    } catch (error) {
        console.error('Error during signup:', error);
        res.send('Error during signup');
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
                    res.redirect('/admin-home');
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

app.get('/post-idea', ensureAuthenticated, (req, res) => {
    res.render('post-idea');
});

app.post('/post-idea', ensureAuthenticated, async (req, res) => {
    const { sectorId, problemStatement } = req.body;
    const contributorId = req.session.userId;

    try {
        await Idea.create({ contributorId, sectorId, problemStatement });
        res.send('Idea posted successfully.');
    } catch (error) {
        console.error('Error during idea submission:', error);
        res.status(500).send('Error during idea submission');
    }
});

app.get('/my-ideas', ensureAuthenticated, async (req, res) => {
    try {
        const ideas = await Idea.find({ contributorId: req.session.userId });
        res.render('my-ideas', { ideas });
    } catch (error) {
        console.error('Error fetching ideas:', error);
        res.status(500).send('Error fetching ideas');
    }
});

app.get('/edit-idea/:id', ensureAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        const idea = await Idea.findOne({ _id: id, contributorId: req.session.userId });
        if (idea) {
            res.render('edit-idea', { idea });
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
    const contributorId = req.session.userId;

    try {
        const idea = await Idea.findOne({ _id: id, contributorId: contributorId });

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
    const contributorId = req.session.userId;

    try {
        const result = await Idea.deleteOne({ _id: id, contributorId: contributorId });

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

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
