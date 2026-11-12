const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../data-access/models/User');

const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const seedPolice = async () => {
  try {
    const mongoUri = process.env.MONGO_URI?.trim();
    if (!mongoUri) {
      throw new Error('MONGO_URI must be set before seeding.');
    }

    const password = process.env.SEED_POLICE_PASSWORD;
    if (!password?.trim()) {
      throw new Error('SEED_POLICE_PASSWORD must be set before seeding a police account.');
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for Seeding');

    const username = 'national_police';
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
