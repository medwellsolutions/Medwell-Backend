# Medwell Backend API

A comprehensive Node.js backend API for the Medwell healthcare platform with robust authentication, authorization, and role-based access control.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication
- 👥 **Role-Based Access Control** - USER, ADMIN, ORGANISER roles
- 🔄 **Refresh Token System** - Automatic token refresh for better UX
- 🛡️ **Security Features** - Rate limiting, helmet, CORS protection
- 📧 **Password Reset** - Email-based password recovery
- 🔒 **Account Security** - Account lockout after failed attempts
- ✅ **Input Validation** - Comprehensive request validation
- 📊 **MongoDB Integration** - Mongoose ODM with advanced schemas

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (running on localhost:27017)
- npm or yarn

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Update the environment variables:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/medwell
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d
   REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key
   REFRESH_TOKEN_EXPIRE=30d
   ```

3. **Start the Server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

4. **Verify Installation**
   Visit `http://localhost:5000/api/health` to check if the API is running.

## API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | User login | Public |
| GET | `/api/auth/me` | Get current user profile | Private |
| POST | `/api/auth/logout` | Logout user | Private |
| POST | `/api/auth/forgotpassword` | Request password reset | Public |
| PUT | `/api/auth/resetpassword/:token` | Reset password | Public |
| PUT | `/api/auth/updatepassword` | Update password | Private |
| POST | `/api/auth/refresh` | Refresh access token | Public |

### Example Requests

#### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123",
  "role": "USER",
  "phone": "+1234567890"
}
```

#### Login User
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "Password123"
}
```

#### Access Protected Route
```bash
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

## User Roles

### USER (Default)
- Basic user permissions
- Can access general user endpoints
- Default role for new registrations

### ORGANISER
- Can manage campaigns and events
- Has elevated permissions for organization features
- Can access organiser-specific endpoints

### ADMIN
- Full system access
- Can manage all users and content
- Has access to all endpoints and administrative features

## Security Features

### Rate Limiting
- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **Password Reset**: 3 requests per hour per IP

### Account Protection
- Account lockout after 5 failed login attempts
- 2-hour lockout duration
- Automatic unlock after timeout

### Password Requirements
- Minimum 6 characters
- Must contain uppercase, lowercase, and number
- Hashed using bcrypt with salt rounds of 12

### Token Security
- JWT tokens with configurable expiration
- Refresh token rotation
- Secure HTTP-only cookie options in production

## Database Schema

### User Model
```javascript
{
  name: String (required, 2-50 chars),
  email: String (required, unique, validated),
  password: String (required, hashed),
  role: String (USER/ADMIN/ORGANISER, default: USER),
  phone: String (optional, validated),
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  dateOfBirth: Date,
  profileImage: String,
  isActive: Boolean (default: true),
  isEmailVerified: Boolean (default: false),
  lastLogin: Date,
  loginAttempts: Number (default: 0),
  lockUntil: Date,
  refreshTokens: [{ token: String, createdAt: Date }],
  // ... additional fields
}
```

## Error Handling

The API uses consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed validation errors if any"]
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `423` - Locked (Account locked)
- `429` - Too Many Requests
- `500` - Internal Server Error

## Development

### Project Structure
```
Medwell-Backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   └── authController.js    # Authentication logic
├── middleware/
│   ├── auth.js              # JWT & authorization middleware
│   ├── validation.js        # Input validation rules
│   ├── errorHandler.js      # Global error handling
│   └── security.js          # Security middleware
├── models/
│   └── User.js              # User schema & methods
├── routes/
│   └── auth.js              # Authentication routes
├── .env.example             # Environment template
├── package.json             # Dependencies & scripts
├── server.js                # Main server file
└── README.md                # This file
```

### Adding New Features

1. **New Routes**: Add to `routes/` directory
2. **Controllers**: Add business logic to `controllers/`
3. **Models**: Add database schemas to `models/`
4. **Middleware**: Add reusable middleware to `middleware/`
5. **Validation**: Add validation rules to `middleware/validation.js`

## Deployment

### Production Checklist
- [ ] Update JWT secrets in environment variables
- [ ] Configure production MongoDB URI
- [ ] Set up email service for password reset
- [ ] Configure CORS for production frontend URL
- [ ] Enable HTTPS and secure cookies
- [ ] Set up monitoring and logging
- [ ] Configure reverse proxy (nginx/Apache)

### Environment Variables (Production)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db/medwell
JWT_SECRET=your-super-secure-production-jwt-secret
REFRESH_TOKEN_SECRET=your-super-secure-refresh-token-secret
FRONTEND_URL=https://your-frontend-domain.com
EMAIL_HOST=your-smtp-server
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-email-password
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@medwellsolutions.com or create an issue in the repository.
