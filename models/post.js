* Cole o seguinte código dentro do arquivo `post.js`:
   ```javascript
  const mongoose = require('mongoose');

   const postSchema = new mongoose.Schema({
     text: {
         type: String,
         required: true,
     },
      user: {
         type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
      },
       likes: {
           type: Number,
           default: 0
       },
    createdAt: {
       type: Date,
       default: Date.now
     }
    });
  const Post = mongoose.model('Post', postSchema);

   module.exports = Post;
   ```
* Salve o arquivo com `Ctrl+X` e `y` e `Enter`.
