const path = require("path");
const http = require("http");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("express-flash");
const methodOverride = require("method-override");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const taskRoutes = require("./routes/taskRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const adminTaskRoutes = require("./routes/adminTaskRoutes");
const adminAssignmentRoutes = require("./routes/adminAssignmentRoutes");
const userRoutes = require("./routes/userRoutes");
const profileRoutes = require("./routes/profileRoutes");
const setLocals = require("./middleware/setLocals");

dotenv.config();

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI is missing. Add it to your .env file.");
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: "sessions"
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.SESSION_SECURE === "true"
    }
  })
);
app.use(flash());
app.use(express.static(path.join(__dirname, "public")));
app.use(setLocals);

app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }

  res.redirect("/login");
});

app.use("/", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/tasks", taskRoutes);
app.use("/assignments", assignmentRoutes);
app.use("/manage-tasks", adminTaskRoutes);
app.use("/manage-assignments", adminAssignmentRoutes);
app.use("/users", userRoutes);
app.use("/profile", profileRoutes);

app.use((req, res) => {
  res.status(404).render("404", {
    title: "Page Not Found"
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).render("error", {
    title: "Server Error",
    error
  });
});

const startServer = async () => {
  try {
    await connectDB(mongoUri);
    const server = http.createServer(app);
    let currentPort = DEFAULT_PORT;

    const listenOnPort = (port) => {
      currentPort = port;
      server.listen(port);
    };

    server.on("listening", () => {
      const address = server.address();
      const activePort = typeof address === "object" && address ? address.port : DEFAULT_PORT;
      console.log(`Server started on http://localhost:${activePort}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        const nextPort = currentPort + 1;
        console.log(`Port ${currentPort} is in use. Trying port ${nextPort}...`);
        setTimeout(() => listenOnPort(nextPort), 200);
        return;
      }

      console.error("Unable to start the application:", error.message);
      process.exit(1);
    });

    listenOnPort(DEFAULT_PORT);
  } catch (error) {
    console.error("Unable to start the application:", error.message);
    process.exit(1);
  }
};

startServer();
