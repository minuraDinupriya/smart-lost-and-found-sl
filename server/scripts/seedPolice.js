const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');

const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const seedPolice = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://minuradinupriya:V1yEib7vIu02hG5k@cluster0.k2qg7.mongodb.net/lost-and-found', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for Seeding');

    const username = 'national_police';
    const password = 'slpolice119';
    const stationName = 'National Police Headquarters';

    const existingPolice = await User.findOne({ username });
    if (existingPolice) {
      console.log('Police account already exists.');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const policeUser = new User({
      username,
      password: hashedPassword,
      role: 'police',
      policeStationName: stationName,
    });

    await policeUser.save();
    console.log(`Successfully created police account: ${username}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding police account:', error);
    process.exit(1);
  }
};

seedPolice();
