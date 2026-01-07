# FoodBridge - MERN Stack Application

A comprehensive food donation platform connecting food donors with NGOs to reduce food waste and help feed those in need.

## 🌟 Features

### For Donors
- **Post Food Donations**: Share surplus food with detailed information
- **Track Donations**: Monitor donation status and impact
- **Real-time Notifications**: Get notified when donations are claimed
- **Donation History**: View complete donation records

### For NGOs
- **Live Feed**: Browse nearby available food donations
- **Interactive Map**: View donations on an interactive map
- **Claim System**: Quick one-click donation claiming
- **My Claims**: Track claimed donations and pickup details

### For Admins
- **User Verification**: Approve/reject user registrations
- **Analytics Dashboard**: View platform statistics and metrics
- **Live Map**: Monitor all active donations
- **User Management**: Comprehensive user list and management

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Nodemailer** - Email service
- **Bcrypt** - Password hashing

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **Redux Toolkit** - State management
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications
- **Leaflet** - Interactive maps

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/JAIN2309/FoodBridge--MERN.git
cd FoodBridge--MERN
```

2. **Backend Setup**
```bash
cd backend
npm install
```

3. **Frontend Setup**
```bash
cd ../frontend
npm install
```

4. **Environment Variables**

Create `.env` file in the backend directory:
```env
MONGODB_URI=mongodb://localhost:27017/foodbridge
JWT_SECRET=your_jwt_secret_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

5. **Start the Application**

Backend (Port 5001):
```bash
cd backend
npm run dev
```

Frontend (Port 5173):
```bash
cd frontend
npm run dev
```

## 📱 User Roles

### 🏢 Donor Organizations
- Restaurants, hotels, catering services
- Post surplus food donations
- Track donation impact

### 🤝 NGO Organizations  
- Non-profit organizations
- Browse and claim food donations
- Help distribute food to those in need

### 👨‍💼 Admin Users
- Platform administrators
- Verify user registrations
- Monitor platform activity

## 🔐 Default Admin Credentials

```
Email: admin@foodbridge.com
Password: Admin@123
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Donations
- `GET /api/donations/nearby` - Get nearby donations
- `POST /api/donations` - Create donation
- `PUT /api/donations/:id/claim` - Claim donation
- `PUT /api/donations/:id/collect` - Mark as collected

### Users
- `GET /api/users/pending` - Get pending verifications
- `PUT /api/users/:id/verify` - Verify user
- `GET /api/users/stats` - Get platform statistics

## 🎨 UI Features

- **Responsive Design** - Works on all devices
- **Dark/Light Theme** - User preference support
- **Interactive Maps** - Real-time donation locations
- **Real-time Updates** - Live notifications and updates
- **Smooth Navigation** - Seamless tab switching
- **Form Validation** - Comprehensive input validation

## 📊 Key Metrics

- **Real-time Tracking** - Live donation status
- **Impact Measurement** - People served counter
- **Success Rate** - Donation completion analytics
- **User Engagement** - Platform usage statistics

## 🔧 Development

### Project Structure
```
foodbridge/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── services/
│   │   └── hooks/
│   └── public/
└── README.md
```

### Available Scripts

Backend:
- `npm run dev` - Start development server
- `npm start` - Start production server
- `npm run create-admin` - Create admin user

Frontend:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**JAIN2309**
- GitHub: [@JAIN2309](https://github.com/JAIN2309)
- Repository: [FoodBridge--MERN](https://github.com/JAIN2309/FoodBridge--MERN)

## 🙏 Acknowledgments

- Thanks to all contributors who helped build this platform
- Special thanks to the open-source community for the amazing tools and libraries
- Inspired by the mission to reduce food waste and help feed those in need

---

**Made with ❤️ to help reduce food waste and fight hunger**