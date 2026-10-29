# EduPass

EduPass is a campus permission-request portal built with React and Express. Students submit requests and supporting documents; faculty and department heads review them; approved requests receive QR passes for verification.

## Features

- Role-based login for students, faculty, HODs, and admins
- Permission requests, approval history, cancellation, and QR pass verification
- Private supporting-document uploads
- Admin user management, dashboards, audit history, and in-app notifications
- Password reset by email when SMTP is configured

## Technologies

React 18, Vite, React Router, Node.js, Express, MongoDB, Mongoose, JWT, and Multer.

## Project layout

- `frontend/` — React application
- `backend/` — Express API, MongoDB models, tests, and development seed data
- `vercel.json` — shared frontend/backend routing for Vercel Services

## Run locally

See [DEPLOYMENT.md](DEPLOYMENT.md) for setup, environment variables, test commands, and deployment instructions.
