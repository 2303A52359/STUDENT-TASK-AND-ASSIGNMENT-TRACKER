# Student Task and Assignment Tracker

Student Task and Assignment Tracker is a full-stack web application built with Node.js, Express.js, MongoDB, and EJS. It follows MVC architecture and includes session-based authentication, separate task and assignment tracking, an admin user panel, profile management, file uploads, and dashboard charts.

## Features

- Login and registration using `express-session`, `connect-mongo`, and `bcryptjs`
- Protected routes with admin-only user management
- Dashboard cards for task, assignment, and user statistics
- Chart.js bar and pie charts
- Full task and assignment CRUD with search, sorting, overdue highlighting, and optional file upload
- Profile editing with profile picture upload and password change
- Local MongoDB support

## Project Structure

```text
project/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── views/
│   ├── auth/
│   ├── dashboard/
│   ├── tasks/
│   ├── users/
│   └── profile/
├── public/
│   ├── css/
│   ├── js/
│   └── uploads/
├── .env.example
├── .gitignore
├── app.js
└── package.json
```

## Local Run Instructions

1. Install Node.js 20+ and MongoDB Community Server, or use MongoDB Atlas.
2. Clone the repository and move into the project folder.
3. Copy `.env.example` to `.env`.
4. Update the environment values in `.env`.
5. Install dependencies:

```bash
npm install
```

6. Start the application:

```bash
npm start
```

7. For auto-reload in development:

```bash
npm run dev
```

8. Open `http://localhost:3000`.

## Environment Variables

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/student-task-tracker
SESSION_SECRET=replace-with-a-strong-secret
SESSION_SECURE=false
```

## MongoDB Atlas Setup

1. Create a free cluster in MongoDB Atlas.
2. Create a database user with a username and password.
3. Open `Network Access` and allow your current IP address.
4. Open `Clusters`, click `Connect`, then choose `Drivers`.
5. Copy the MongoDB connection string.
6. Replace `<username>`, `<password>`, and database name in the URI.
7. Paste the final URI into `MONGODB_URI` in `.env`.

Example:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/student-task-tracker?retryWrites=true&w=majority
```

## GitHub Push Steps

1. Create an empty repository on GitHub.
2. Initialize git locally if needed:

```bash
git init
```

3. Add files and commit:

```bash
git add .
git commit -m "Build Student Task and Assignment Tracker"
```

4. Add your GitHub repository as origin:

```bash
git remote add origin https://github.com/your-username/student-task-and-assignment-tracker.git
```

5. Push to GitHub:

```bash
git branch -M main
git push -u origin main
```

## Notes

- Uploaded task and assignment files are saved in `public/uploads/tasks`.
- Uploaded profile images are saved in `public/uploads/profiles`.
- The default profile image is included in the repository.
- Admin accounts can update user roles and delete users.
- For local MongoDB, make sure the MongoDB service is running before starting the app.
