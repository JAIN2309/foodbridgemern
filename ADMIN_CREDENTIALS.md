# Admin Credentials & Setup

## Default Admin Account

**Email:** `admin@foodbridge.com`  
**Password:** `admin123`  
**Role:** `admin`

## Super Admin Account

**Email:** `superadmin@foodbridge.com`  
**Password:** `superadmin123`  
**Role:** `super_admin`

## Setup Instructions

### 1. Create Admin User
```bash
cd backend
npm run create-admin
```

### 2. Create Super Admin User
```bash
cd backend
npm run create-super-admin
```

### 3. Login as Admin/Super Admin
1. Go to `/login` page
2. Enter credentials above
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

## Super Admin Additional Capabilities

### Admin Management
- Create, modify, and delete admin accounts
- Manage admin permissions and roles
- Override admin decisions

### System Control
- Full platform configuration access
- Database management capabilities
- System-wide settings control

## Security Notes

⚠️ **Important:** Change the default passwords after first login for security.

Both admin and super admin accounts are automatically verified and have platform access without requiring approval from another admin.