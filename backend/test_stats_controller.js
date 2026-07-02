// Test stats controller functions
export const getTestStats = async (req, res) => {
  try {
    res.status(200).json({ message: 'Success retrieving test stats' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
