# Admin Credentials & Setup

## Default Admin Account

**Email:** `admin@foodbridge.com`  
**Password:** `admin123`  
**Role:** `admin`

## Setup Instructions

### 1. Create Admin User
```bash
cd backend
npm run create-admin
```

### 2. Login as Admin
1. Go to `/login` page
2. Enter admin credentials above
3. Access admin dashboard at `/dashboard`

## Admin Capabilities

### User Verification
- View pending user registrations
- Approve/reject donor and NGO accounts
- Manage user verification status

### Platform Analytics
- View total donations and users
- Monitor completion rates
- Track meals served impact

### Live Monitoring
- Real-time map of all donations
- Monitor active food postings
- Track platform health metrics

### System Management
- User management and oversight
- Platform statistics and reporting
- Verification queue management

## Security Notes

⚠️ **Important:** Change the default password after first login for security.

The admin account is automatically verified and has full platform access without requiring approval from another admin.