const mongoose = require('mongoose');
require('dotenv').config();

const clean = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    const result = await mongoose.connection.collection('resources').deleteMany({});
    console.log(`Deleted ${result.deletedCount} resources from database.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

clean();
