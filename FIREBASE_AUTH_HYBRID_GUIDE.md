# Hướng Dẫn Triển Khai Firebase Auth Hybrid với MongoDB

## Tổng Quan

Hướng dẫn này mô tả cách triển khai authentication hybrid sử dụng Firebase Authentication cho security và MongoDB để lưu trữ user profile data tùy chỉnh. Cách tiếp cận này cho phép:

- Firebase Auth quản lý đăng ký, đăng nhập, password reset, email verification
- MongoDB lưu trữ thông tin user tùy chỉnh (roles, staffId, business logic)
- Hỗ trợ chuyển tiếp từ hệ thống JWT hiện tại

## Bước 1: Setup Firebase Project

### 1.1 Tạo Firebase Project
1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Tạo project mới hoặc chọn project existing
3. Enable Authentication service

### 1.2 Cài đặt Firebase Admin SDK
```bash
npm install firebase-admin
```

### 1.3 Tạo Service Account Key
1. Trong Firebase Console > Project Settings > Service Accounts
2. Generate new private key
3. Download JSON file và đặt vào `config/firebase-service-account.json`
4. Thêm vào `.gitignore`: `config/firebase-service-account.json`

### 1.4 Cấu hình Firebase trong Code
Tạo file `config/firebase.js`:
```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // projectId: process.env.FIREBASE_PROJECT_ID, // optional
});

module.exports = admin;
```

## Bước 2: Cập Nhật User Model

### 2.1 Thêm Firebase UID vào Schema
Cập nhật `models/user.model.js`:

```javascript
const userSchema = new mongoose.Schema({
  // ... existing fields
  firebaseUid: { type: String, unique: true, sparse: true },
  // ... rest of schema
}, { timestamps: true });

// Cập nhật pre-save hook để không hash password nếu có firebaseUid
userSchema.pre('save', async function (next) {
  try {
    // Chỉ hash password nếu không có firebaseUid (cho users cũ)
    if (this.isModified('password') && this.password && !this.firebaseUid) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    // ... existing staffId logic
    next();
  } catch (err) {
    next(err);
  }
});
```

### 2.2 Thêm Method để Sync với Firebase
```javascript
// Method để tạo/cập nhật user từ Firebase Auth
userSchema.statics.findOrCreateFromFirebase = async function(firebaseUser) {
  let user = await this.findOne({ firebaseUid: firebaseUser.uid });

  if (!user) {
    // Tìm theo email nếu chưa có firebaseUid
    user = await this.findOne({ email: firebaseUser.email });
    if (user) {
      user.firebaseUid = firebaseUser.uid;
    } else {
      // Tạo user mới
      user = new this({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        fullname: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        username: firebaseUser.email.split('@')[0],
        avatar: firebaseUser.photoURL,
      });
    }
    await user.save();
  }

  return user;
};
```

## Bước 3: Tạo Firebase Auth Controller

Tạo file `controllers/firebaseAuth.controller.js`:

```javascript
const admin = require('../config/firebase');
const User = require('../models/user.model');

// Đăng ký với Firebase Auth
exports.register = async (req, res) => {
  const { email, password, fullname } = req.body;

  try {
    // Tạo user trong Firebase Auth
    const firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName: fullname,
    });

    // Tạo user trong MongoDB
    const user = await User.findOrCreateFromFirebase({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: fullname,
    });

    // Tạo custom token để client login
    const customToken = await admin.auth().createCustomToken(firebaseUser.uid);

    res.status(201).json({
      message: 'Đăng ký thành công',
      customToken,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        fullname: user.fullname,
      }
    });
  } catch (error) {
    console.error('Firebase register error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Đăng nhập với Firebase Auth
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Verify credentials với Firebase
    const firebaseUser = await admin.auth().getUserByEmail(email);

    // Lấy user từ MongoDB
    const user = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại trong database' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
    }

    // Tạo custom token
    const customToken = await admin.auth().createCustomToken(firebaseUser.uid);

    res.json({
      customToken,
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
  }
};

// Login với Google (Firebase Auth)
exports.googleLogin = async (req, res) => {
  const { idToken } = req.body;

  try {
    // Verify Google ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUser = await admin.auth().getUser(decodedToken.uid);

    // Sync với MongoDB
    const user = await User.findOrCreateFromFirebase(firebaseUser);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

// Logout
exports.logout = async (req, res) => {
  // Với Firebase, logout được handle ở client-side
  res.json({ message: 'Đăng xuất thành công' });
};
```

## Bước 4: Cập Nhật Middleware Authentication

Cập nhật `middlewares/auth.middleware.js`:

```javascript
const jwt = require('jsonwebtoken');
const admin = require('../config/firebase');
const User = require('../models/user.model');

// Middleware hỗ trợ cả JWT và Firebase tokens
const protect = async (req, res, next) => {
  let token;

  // Check for Firebase ID token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];

    try {
      // Thử verify Firebase token trước
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = await User.findOne({ firebaseUid: decodedToken.uid }).select('-password');

      if (req.user) {
        req.authType = 'firebase';
        return next();
      }
    } catch (firebaseError) {
      // Nếu không phải Firebase token, thử JWT
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (req.user) {
          req.authType = 'jwt';
          return next();
        }
      } catch (jwtError) {
        // Không phải token hợp lệ
      }
    }
  }

  return res.status(401).json({ message: 'Token không hợp lệ' });
};

// Middleware chỉ cho Firebase Auth
const protectFirebase = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Thiếu token' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = await User.findOne({ firebaseUid: decodedToken.uid }).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'User không tồn tại' });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Token Firebase không hợp lệ' });
  }
};

module.exports = { protect, protectFirebase, isAdmin, isStaff, isShipper };
```

## Bước 5: Tạo Routes Firebase Auth

Tạo file `routes/firebaseAuth.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const { protectFirebase } = require('../middlewares/auth.middleware');

const {
  register,
  login,
  googleLogin,
  logout
} = require('../controllers/firebaseAuth.controller');

// Firebase Auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/logout', protectFirebase, logout);

module.exports = router;
```

Cập nhật `server.js` để sử dụng routes mới:
```javascript
const firebaseAuthRoutes = require('./routes/firebaseAuth.routes');
// ...
app.use('/api/firebase-auth', firebaseAuthRoutes);
```

## Bước 6: Migration Strategy

### 6.1 Chuyển Tiếp Users
1. **Users mới**: Sử dụng Firebase Auth
2. **Users cũ**: Vẫn dùng JWT, migrate dần
3. **Sync data**: Khi user login Firebase, cập nhật `firebaseUid`

### 6.2 Script Migration (Optional)
Tạo script để migrate users hiện tại sang Firebase:

```javascript
// scripts/migrateToFirebase.js
const admin = require('../config/firebase');
const User = require('../models/user.model');

async function migrateUsers() {
  const users = await User.find({ firebaseUid: { $exists: false } });

  for (const user of users) {
    try {
      // Tạo user trong Firebase Auth
      const firebaseUser = await admin.auth().createUser({
        email: user.email,
        password: 'tempPassword123!', // User cần reset password
        displayName: user.fullname,
      });

      // Cập nhật MongoDB
      user.firebaseUid = firebaseUser.uid;
      await user.save();

      console.log(`Migrated user: ${user.email}`);
    } catch (error) {
      console.error(`Failed to migrate ${user.email}:`, error.message);
    }
  }
}

migrateUsers();
```

## Bước 7: Client-Side Integration

### 7.1 Firebase Client SDK
```bash
npm install firebase
```

### 7.2 Client Code Example
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Login với email/password
const loginWithEmail = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await userCredential.user.getIdToken();

  // Gửi idToken lên server
  const response = await fetch('/api/firebase-auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });

  return response.json();
};

// Login với Google
const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();

  const response = await fetch('/api/firebase-auth/google-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });

  return response.json();
};
```

## Bước 8: Testing

### 8.1 Unit Tests
```javascript
// tests/firebaseAuth.test.js
const request = require('supertest');
const app = require('../server');

describe('Firebase Auth', () => {
  it('should register new user', async () => {
    const res = await request(app)
      .post('/api/firebase-auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        fullname: 'Test User'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('customToken');
  });
});
```

### 8.2 Integration Tests
- Test login flow
- Test protected routes với Firebase tokens
- Test migration từ JWT sang Firebase

## Bước 9: Security Considerations

1. **Environment Variables**: Bảo mật Firebase service account key
2. **Token Validation**: Luôn verify tokens ở server-side
3. **Rate Limiting**: Thêm rate limiting cho auth endpoints
4. **Audit Logs**: Log authentication events
5. **Password Policies**: Sử dụng Firebase password policies

## Troubleshooting

### Common Issues:
1. **Service Account Key**: Đảm bảo file JSON đúng format
2. **Project ID**: Check Firebase project ID trong config
3. **CORS**: Cấu hình CORS cho Firebase Auth
4. **Token Expiration**: Firebase tokens expire sau 1 giờ

### Debug Tips:
- Sử dụng Firebase Console để monitor authentication
- Check server logs cho errors
- Verify tokens với Firebase Admin SDK

## Kết Luận

Cách tiếp cận hybrid này cho phép bạn:
- Tận dụng security của Firebase Auth
- Giữ flexibility của MongoDB cho business logic
- Chuyển tiếp dần mà không break existing users
- Scale dễ dàng với Firebase ecosystem

Tham khảo [Firebase Documentation](https://firebase.google.com/docs/auth) để biết thêm chi tiết.
