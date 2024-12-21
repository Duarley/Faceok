const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const Post = require('../models/post');
const Message = require('../models/message');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/echoverse';

mongoose.connect(MONGODB_URI, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Conectado ao MongoDB'));

 //Configuração do passport
 passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
},
 async (accessToken, refreshToken, profile, done) => {
   try {
      const existingUser = await User.findOne({ googleId: profile.id });

         if (existingUser) {
             return done(null, existingUser);
        }

         const newUser = new User({
             googleId: profile.id,
            name: profile.displayName,
             email: profile.emails[0].value,
             profilePicture: profile.photos[0].value,
         });

      await newUser.save();
         done(null, newUser);
      } catch (error) {
          done(error, false);
      }
  }
));

passport.serializeUser((user, done) => {
   done(null, user.id);
});

 passport.deserializeUser(async (id, done) => {
   try {
      const user = await User.findById(id);
      done(null, user);
   } catch (error) {
         done(error, false);
      }
});

// Inicialize o Passport
app.use(passport.initialize());
app.use(passport.session());

// Rotas de autenticação
 app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

app.get('/auth/google/callback',
    passport.authenticate('google', {
      failureRedirect: '/login/failed',
         successRedirect: '/login/success'
     })
 );

app.get('/login/failed', (req, res) => {
   res.status(401).json({
       message: "Falha no Login",
       success: false,
   });
});

app.get('/login/success', (req, res) => {
     if (req.user) {
      res.status(200).json({
         message: "Login efetuado com sucesso!",
           success: true,
          user: req.user
        });
    } else {
     res.status(401).json({
          message: "Falha no Login",
           success: false
       });
     }
});

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.status(200).json({
          message: 'Deslogado com sucesso!',
           success: true,
      })
    });
});
 // Defina suas rotas aqui
app.get('/', (req, res) => {
     res.send('API do EchoVerse está funcionando!');
});

//Rota para criar posts
app.post('/posts', async (req, res) => {
    try {
         const {text, userId} = req.body;

         const newPost = new Post({
             text,
             user: userId,
         });

       await newPost.save();
           res.status(201).json({message: "Post Criado", newPost});
     } catch (error) {
           res.status(500).json({error: "Erro ao criar o Post", details: error});
      }
});

  //Rota para pegar posts
app.get('/posts', async (req, res) => {
     try {
          const posts = await Post.find().populate('user', 'name profilePicture');
          res.status(200).json({ posts });
     }
      catch (error) {
           res.status(500).json({ error: "Erro ao pegar os posts" });
     }
});

//Rota para pegar posts pelo ID
app.get('/posts/:id', async (req, res) => {
     try {
          const postId = req.params.id;
           const post = await Post.findById(postId).populate('user', 'name profilePicture');

          if (!post) {
              return res.status(404).json({ message: "Post não encontrado" });
          }
         res.status(200).json(post);
      } catch (error) {
          res.status(500).json({ error: "Erro ao buscar post", details: error });
     }
 });

// Rota para dar like
app.post('/posts/:id/like', async (req, res) => {
    try {
        const postId = req.params.id;
         const post = await Post.findById(postId);

        if (!post) {
          return res.status(404).json({ message: "Post não encontrado" });
        }
       post.likes +=1;
       await post.save();
         res.status(200).json({ message: "Like adicionado com sucesso", post });
   } catch (error) {
       res.status(500).json({ error: "Erro ao adicionar like", details: error });
   }
 });

//Rota para enviar mensagens
app.post('/messages', async (req, res) => {
    try {
         const {senderId, recipientId, content} = req.body;

          const newMessage = new Message({
             sender: senderId,
             recipient: recipientId,
            content
           });

        await newMessage.save();
          res.status(201).json({ message: "Mensagem enviada com sucesso", newMessage });
      }catch (error){
        res.status(500).json({ error: "Erro ao enviar mensagem", details: error });
      }
  });

//Rota para pegar mensagens
app.get('/messages/:userId', async (req, res) => {
     try{
         const userId = req.params.userId;
         const messages = await Message.find({
            $or: [{sender: userId}, {recipient: userId}],
         }).populate('sender', 'name profilePicture')
             .populate('recipient', 'name profilePicture');

        res.status(200).json({ messages });
    }
    catch(error){
          res.status(500).json({error: "Erro ao pegar mensagens", details: error})
   }
 });
module.exports = async (req, res) => {
  await app(req, res);
};
