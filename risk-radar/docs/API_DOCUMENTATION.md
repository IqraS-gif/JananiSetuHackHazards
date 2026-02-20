# API Documentation

## Authentication (`/api/auth`)
*   `POST /register`: Register a new user.
*   `POST /login`: Authenticate a user and return a token.

## Users (`/api/users`)
*   `GET /profile`: Get current user profile.
*   `PUT /profile`: Update user profile.

## Assessments (`/api/assessments`)
*   `POST /`: Submit data for a new assessment.
    *   If ML processing is required, this endpoint forwards data to the ML Service.
*   `GET /`: Get all assessments for the current user.
*   `GET /:id`: Get details of a specific assessment.

## Health (`/api/health`)
*   `GET /`: Check the health status of the API and database connection.
