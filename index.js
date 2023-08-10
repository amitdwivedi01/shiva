const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const secretKey = "your_secret_key_shiva_industries";
const nodemailer = require("nodemailer");
const Env = require('dotenv').config();

const password = process.env.password

const DB = process.env.DB_HOST

const app = express();
const PORT = 3000;
const url =
  `${DB}`;

const corsOptions = {
  origin: "*",
};

app.use(bodyParser.urlencoded({ extended: true }));

const predefinedUsername = "amit";
const predefinedPassword = "password";

// Use the CORS middleware with the specified options
app.use(cors(corsOptions));
app.use(express.json());

mongoose
  .connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected successfully to the database");
  })
  .catch((error) => {
    console.error("Failed to connect to the database:", error);
  });

const dataSchema = new mongoose.Schema({
  textData: String,
  imageUrl: String,
});

// Create a model
const Message = mongoose.model("Message", dataSchema);

// Middleware to check if the token is valid and add user information to the request object
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. Token missing." });
  }

  try {
    const decodedToken = jwt.verify(token, secretKey);
    req.user = decodedToken.user; // Save the user information in the request object
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token." });
  }
};

const upload = multer({
  limits: { fieldSize: 2 * 1024 * 1024 }
});

// Handle form submission

app.post("/upload", upload.single("image"), async (req, res) => {
  const textData = req.body.textData;
  // console.log(req.body.image, "body");
  const imageBuffer = req.body.image; // Get the image buffer directly
  // const imageBuffer1 = fs.readFileSync("");
  // const base64Image = imageBuffer.toString("base64"); // Convert buffer to base64
  // console.log(base64Image, "base64Image")

  const dbimage = await Message.find({}).exec();

  if (dbimage.length > 0) {
    await Message.deleteMany({});
    await Message.create({ textData: textData, imageUrl: imageBuffer });
    const reply = { submitted: true };
    res.json(reply); // Send a response with JSON
  } else {
    await Message.create({ textData: textData, imageUrl: imageBuffer });
    res.json({ submitted: true }); // Send a response with JSON
  }
});

app.get("/data", async (req, res) => {
  try {
    const message = await Message.find({}).exec();
    if (message.length == 0) {
      const data = { message: "empty", img: "empty" };
      res.json(data);
    } else {
      let data = { message: message[0].textData, img: message[0].imageUrl };
      const response = data.img.toString("base64");
      data.img = response;
      res.json(data);
    }
  } catch (error) {
    console.log(error);
  }
});

// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "Gmail", // Replace with your email service provider
  auth: {
    user: "marketing@shivaperformance.com", // Replace with your email address
    pass: password // Replace with your email password
  },
});

// Define a route to handle incoming email messages
app.post("/receive-email", (req, res) => {
  const { name, email, phone, message } = req.body;
  Newmessage = `${email} - ${message}`;
  const subject = "message from the customer";
  // Create an email message
  const mailOptions = {
    from: 'marketing@shivaperformance.com',
    // email,
    to: "marketing@shivaperformance.com", // Replace with your email address
    subject,
    text: Newmessage,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      res.status(500).send("Error sending email");
    } else {
      console.log("Email sent:", info.response);
      res.send("Email sent successfully");
    }
  });
});

app.post("/login", async (req, res) => {
  // Get the username and password from the form data (sent by the frontend)
  const { username, password } = req.body;

  try {
    // Check if the username and password match the predefined values
    if (username === predefinedUsername && password === predefinedPassword) {
      // Generate a JWT token with user information and send it as a response
      const token = jwt.sign({ user: { username: username } }, secretKey, {
        expiresIn: "1h", // Token will expire in 1 hour
      });

      res.json({ success: true, token });
    } else {
      // Send an error response
      res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

app.delete("/deleteAllData", async (req, res) => {
  try {
    // Use the DataModel to delete all documents in the collection
    await Message.deleteMany({});

    res.json({ success: true, message: "All data deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete data." });
  }
});

// Protected admin route, only accessible with a valid token and admin role
app.get("/admin.html", authenticateToken, (req, res) => {
  // The middleware will verify the token and add user information to req.user
  // You can add more checks based on user roles if required
  res.sendFile(
    path.join(__dirname, "https://www.shivaperformance.com/login.html")
  );
});

app.listen(PORT, (error) => {
  if (!error)
    console.log(
      "Server is Successfully Running, and App is listening on port " + PORT
    );
  else console.log("Error occurred, server can't start", error);
});
