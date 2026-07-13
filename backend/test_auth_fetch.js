import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const token = jwt.sign({ id: '6a53c156f2fac30ebf9ef63a' }, process.env.JWT_SECRET || 'fallback', { expiresIn: '1h' });
  try {
    const res = await fetch('http://localhost:5000/api/advisor/dashboard-summary', {
      headers: {
        'Cookie': `accessToken=${token}`
      }
    });
    const text = await res.text();
    console.log('STATUS:', res.status);
    console.log('BODY:', text);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
run();
