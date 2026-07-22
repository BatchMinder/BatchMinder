import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Curriculum from './models/curriculum.js';
dotenv.config();

const run = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Searching for curriculum maps for 2022 batch...');
    const curriculums = await Curriculum.find({ batch: '2022' });
    console.log('Curriculums found:', curriculums.map(c => `${c.version} (batch: ${c.batch}, dept: ${c.department}, courses: ${c.courses.length})`));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

run();
