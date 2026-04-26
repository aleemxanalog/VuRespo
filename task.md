# Final Storefront Features (Auth & Checkout)

- [x] 1. Update Database Schema
  - [x] Add `users` table (`id`, `name`, `email`, `password`, `is_admin`)
  - [x] Add `orders` table (`id`, `user_id`, `total`, `status`)
- [x] 2. Implement Authentication API
  - [x] `POST /api/register`
  - [x] `POST /api/login`
  - [x] Create simple session/token validation for admin routes
- [x] 3. Secure the Dashboard
  - [x] Update [server.py](file:///c:/Users/Aleem/Desktop/gravity/server.py) to protect [/dashboard.html](file:///c:/Users/Aleem/Desktop/gravity/static/dashboard.html) and `POST/DELETE /api/products` routes
  - [x] Add a login gate to [dashboard.html](file:///c:/Users/Aleem/Desktop/gravity/static/dashboard.html)
- [x] 4. Connect Storefront Forms
  - [x] Update [script.js](file:///c:/Users/Aleem/Desktop/gravity/script.js) to handle `/api/register` and `/api/login` forms
  - [x] Update UI to reflect logged-in state (e.g., Change "User" icon to "Logout")
  - [x] Connect checkout form to an `orders` endpoint (`POST /api/checkout`)
- [x] 5. Verification
  - [x] Test User Registration & Login
  - [x] Test Admin Login & protected Dashboard access
  - [x] Test Checkout Flow
