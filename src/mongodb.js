const mongoose = require('mongoose');


mongoose.connect('mongodb://localhost:27017/LoginSignup', {
    
});

const db = mongoose.connection;

db.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

db.once('open', () => {
    console.log('Connected to MongoDB');
});


const contributorSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const Contributor = mongoose.model('Contributor', contributorSchema);

const investorSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    company: { type: String, required: true },
    idProof: { type: String, required: true } 
});

const Investor = mongoose.model('Investor', investorSchema);


const adminSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    
});

const Admin = mongoose.model('Admin', adminSchema);


const sectorSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

const Sector = mongoose.model('Sector', sectorSchema);


const ideaSchema = new mongoose.Schema({
    contributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contributor', required: true },
    sectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector', required: true },
    problemStatement: { type: String, required: true },
    datePosted: { type: Date, default: Date.now }
});

const Idea = mongoose.model('Idea', ideaSchema);

module.exports = { Contributor, Investor, Admin, Idea, Sector };