const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const passport = require('passport');

const connectDB = require('./config/database');  // 🔧 Đường dẫn DB

dotenv.config();
connectDB();
require('./config/passport');  // import sau dotenv.config()


const userRoutes = require('./routes/user.routes')
const toppingRoutes = require('./routes/topping.routes');
const sizeRoutes = require('./routes/size.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const storeRoutes = require('./routes/store.routes');
const favouriteRoutes = require('./routes/favourite.routes');
const cartRoutes = require('./routes/cart.routes');
const discountRoutes = require('./routes/discount.routes');
const userDiscountRoutes = require('./routes/userDiscount.routes');
const loyaltyRoutes = require('./routes/loyalty.routes');
const orderRoutes = require('./routes/order.routes');
const passwordRoutes = require('./routes/password.routes');
const adminDashboardRoutes = require('./routes/adminDashboard.routes');

const shipperRoutes = require('./routes/shipper.routes')

const aiRoutes = require('./routes/chatbot.routes'); // Import chatbot routes


const app = express();
// Configure CORS explicitly
app.use(cors({
  origin: ['http://localhost:8080', 'http://10.0.2.2:8080', 'http://10.0.2.2'], // Allow emulator and local origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow Authorization header
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());




// users routes
// ✅ Cách đúng: Test API trả về chuỗi "Hello World"
app.get('/', (req, res) => {
  res.send('✅ Hello World from Render!');
});

const authRoutes = require('./routes/auth.routes');   // authRoutes phải gọi sau .env
const firebaseAuthRoutes = require('./routes/firebaseAuth.routes'); // Firebase Auth routes

app.use('/api/auth', authRoutes);
app.use('/api/firebase-auth', firebaseAuthRoutes);
app.use('/api/users',userRoutes);
app.use('/api/toppings', toppingRoutes);
app.use('/api/sizes', sizeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/favourites', favouriteRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/user-discounts', userDiscountRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);

app.use('/api/shipper', shipperRoutes);

app.use('/api/chatbot', aiRoutes); // Đăng ký chatbot routes



const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () =>{
   console.log(`🚀 HHHHHHH Server running on http://localhost:${PORT}`)
});
