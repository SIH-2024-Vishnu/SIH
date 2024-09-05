const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/LoginSignup')

const db = mongoose.connection;

db.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Contributor Schema
const contributorSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const Contributor = mongoose.model('Contributor', contributorSchema);

// Investor Schema
const investorSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    company: { type: String, required: true },
    idProof: { type: String, required: true },
    username: { type: String, unique: true }, // For admin to assign
    password: { type: String },               // For admin to assign
    credentialsAssigned: { type: Boolean, default: false } // Tracks if credentials are assigned
});

const Investor = mongoose.model('Investor', investorSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

const Admin = mongoose.model('Admin', adminSchema);

// Sector Schema
const sectorSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

const Sector = mongoose.model('Sector', sectorSchema);

// Idea Schema
const ideaSchema = new mongoose.Schema({
    contributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contributor', required: true },
    sectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector', required: true },
    problemStatement: { type: String, required: true },
    datePosted: { type: Date, default: Date.now }
});

const Idea = mongoose.model('Idea', ideaSchema);

module.exports = { Contributor, Investor, Admin, Idea, Sector };
