const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;
      const avatar = profile.photos[0].value;
      const fullname = profile.displayName || `${profile.name.givenName} ${profile.name.familyName}`;


      try {
        // Tìm theo googleId
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Nếu chưa có theo googleId, tìm theo email
          user = await User.findOne({ email });

          if (user) {
            // Đã có user với email → cập nhật thêm googleId
            user.googleId = profile.id;
            await user.save();
          } else {
            // Hoàn toàn mới → tạo user
            user = await User.create({
              googleId: profile.id,
              fullname,
              email,
              avatar,
              username: email.split('@')[0], // 👈 bạn muốn chỉ dùng phần trước @ (ví dụ huy123 từ huy123@gmail.com),
            });
          }
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

// Serialize user to session (bắt buộc cho passport nhưng không dùng với JWT)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then(user => done(null, user));
});
