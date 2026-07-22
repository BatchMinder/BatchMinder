# BatchMinder

Advising students, managing timetables, and keeping up with HOD approvals usually involves a messy mix of Excel sheets, emails, and physical paperwork. We built **BatchMinder** to pull all of that into one clean, central space.

This codebase covers **Module 1**: setting up authentication, role-based access, and automated session audit logging.

---

## ✨ Features We Built

* **Same Email, Multiple Roles (Hat-Switching)**: Advisors often wear multiple hats (like being a Batch Advisor but also an HOD/Admin). Instead of forcing you to sign up with three different email addresses, BatchMinder lets you register the *same* email under different roles. They act as completely independent accounts.
* **Instant Email Checks**: No one likes filling out a long form only to find out their email is already registered after hitting submit. The signup form checks if your email/role combination is taken the moment you click away from the field.
* **Database Audit Logs**: Every login, failed attempt, registration, and logout writes an audit log to MongoDB. It helps administrators track system access without manual monitoring.
* **Multi-Level Course Approval Workflow (FE-19 to FE-24)**: Full request lifecycle management (`pending`, `advisor_approved`, `approved`, `rejected`, `special_granted`, `returned_for_edit`). Strictly enforced **Advisor → HOD chain only**, where Level-1 is handled by Batch Advisors and Level-2 is strictly restricted to the Head of Department (`restrictTo('admin')` in `hodRoutes.js`).
* **Organic SaaS Design**: Built with a clean, premium light mode that uses **Plus Jakarta Sans** for body texts and **Outfit** for headers. No harsh default colors—just soft gradients, clean focus outlines, and drop shadows.
* **Logout Safety Net**: Clicking log out triggers a prompt modal so you don't accidentally close an active advising session.

> 📄 Detailed requirements and approval chain specifications can be found in [REQUIREMENTS.md](file:///c:/Users/HP/Desktop/BatchMinders/REQUIREMENTS.md).

---

## 🛠️ Tech Stack

* **Frontend**: React (Vite), Tailwind CSS, Lucide Icons
* **Backend**: Node.js, Express, `jsonwebtoken` (for session tokens), `bcryptjs` (for secure password hashing)
* **Database**: MongoDB Atlas with Mongoose

---

## 🚀 Setting Up Locally

To run this project on your machine, follow these steps:

### 1. The Backend API

1. Go to the backend folder:
   ```bash
   cd backend
   ```
2. Install the packages:
   ```bash
   npm install
   ```
3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
4. Open `.env` and fill in your details:
   - Paste your MongoDB Atlas URI.
   - Enter a secure string for `JWT_SECRET` (e.g. a long random phrase).
5. Start the backend:
   ```bash
   npm run dev
   ```
   *The API will start running on `http://localhost:5000`.*

---

### 2. The Frontend App

1. Open a new terminal and go to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the packages:
   ```bash
   npm install
   ```
3. Setup your environment file:
   ```bash
   cp .env.example .env
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *Vite will start the dev server at `http://localhost:3000`.*

---

## 📂 Codebase Tour

Here is a quick look at where things live:

* `/backend`
  * `/models`: Mongoose schemas for `User` and `AuditLog`.
  * `/middleware`: JWT checking (`authMiddleware.js`) and role restrictions (`roleMiddleware.js`).
  * `/controllers`: Request logic for login, registration, audit log retrieval, and email checks.
  * `server.js`: Connects to the database and automatically configures database indexes on startup.
* `/frontend`
  * `/src/components`: UI files for `Login.jsx` and `Signup.jsx`.
  * `/src/contexts/AuthContext.jsx`: Keeps track of the active user session.
  * `/src/services/auth.js`: Handles API calls to login, register, and check email availability.
