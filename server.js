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

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());




// users routes
// ✅ Cách đúng: Test API trả về chuỗi "Hello World"
app.get('/', (req, res) => {
  res.send('✅ Hello World from Render!');
});

const authRoutes = require('./routes/auth.routes');   // authRoutes phải gọi sau .env
app.use('/api/auth', authRoutes);
app.use('/api/users',userRoutes)
app.use('/api/toppings', toppingRoutes);
app.use('/api/sizes', sizeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/favourites', favouriteRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/discounts', discountRoutes);




const PORT = process.env.PORT || 8080;

app.listen(PORT,  () =>{
   console.log(`🚀 HHHHHHH Server running on http://localhost:${PORT}`)
});