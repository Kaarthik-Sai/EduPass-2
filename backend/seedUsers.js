require("dotenv").config();

const mongoose = require("mongoose");
const { User } = require("./models");
const { ROLES } = require("./config/constants");

const PASSWORD = "Edupass@123";
const users = [
  { loginId: "ADMIN001", name: "Admin", role: ROLES.ADMIN },
  { loginId: "HODCSE", name: "CSE HOD", role: ROLES.HOD },
  { loginId: "HODECE", name: "ECE HOD", role: ROLES.HOD },
  { loginId: "FAC101", name: "Faculty 101", role: ROLES.FACULTY },
  { loginId: "FAC102", name: "Faculty 102", role: ROLES.FACULTY },
  { loginId: "FAC103", name: "Faculty 103", role: ROLES.FACULTY },

  ...Array.from({ length: 8 }, (_, i) => {
    const studentId = `21CSE${String(i + 1).padStart(3, "0")}`;

    return {
      loginId: studentId,
      studentId,
      name: `Student ${i + 1}`,
      role: ROLES.STUDENT,
    };
  }),
];

async function seedUsers() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing from backend/.env");
  }

  if (!PASSWORD) {
    throw new Error("SEED_USER_PASSWORD is missing from backend/.env");
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    for (const userData of users) {
      const email = `${userData.loginId.toLowerCase()}@edupass.local`;

      let user = await User.findOne({
        loginId: userData.loginId,
      });

      if (!user) {
        user = new User({
          ...userData,
          email,
          password: PASSWORD,
          mustChangePassword: true,
        });
      } else {
        user.name = userData.name;
        user.email = email;
        user.role = userData.role;
        user.password = PASSWORD;
        user.mustChangePassword = true;

        if (userData.role === ROLES.STUDENT) {
          user.studentId = userData.studentId;
        }
      }

      await user.save();

      console.log(`Seeded: ${userData.loginId}`);
    }

    console.log(`Successfully seeded all ${users.length} users.`);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

seedUsers();
