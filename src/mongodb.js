const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/LoginSignup', {
    // No need to specify useNewUrlParser and useUnifiedTopology
});

const db = mongoose.connection;

db.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Define Contributor schema
const contributorSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const Contributor = mongoose.model('Contributor', contributorSchema);

// Define Investor schema
const investorSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    company: { type: String, required: true },
    idProof: { type: String, required: true } // Path to the uploaded file
});

const Investor = mongoose.model('Investor', investorSchema);

// Define Admin schema
const adminSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    // No password hashing in this example for simplicity
});

const Admin = mongoose.model('Admin', adminSchema);

// Define Sector schema
const sectorSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

const Sector = mongoose.model('Sector', sectorSchema);

// Define Idea schema
const ideaSchema = new mongoose.Schema({
    contributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contributor', required: true },
    sectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector', required: true },
    problemStatement: { type: String, required: true },
    datePosted: { type: Date, default: Date.now }
});

const Idea = mongoose.model('Idea', ideaSchema);

module.exports = { Contributor, Investor, Admin, Idea, Sector };
