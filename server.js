// use lib - express
const { response, request } = require('express');
const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override');
const env = require('dotenv').config();

//create obj
const app = express();
app.set('view engine', 'ejs');
//open server
//1st param : port number
//2nd parm : function
app.use(bodyParser.urlencoded({ extended: true }));

//middleware
app.use('/public', express.static('public'));
app.use(methodOverride('_method'));

// set up listen function
// app.listen(8080, function () {
//   console.log('Listening on 8080');
// });

//Connect with Mongo DB

//variable for db
var db;
MongoClient.connect(process.env.DB_URL, function (err, client) {
  if (err) return console.log(err);
  db = client.db('todoapp');

  //data type : object
  //obj _id is mandatory
  // db.collection('post').insertOne(
  //   { _id: 1, name: 'John', :  age: 20},
  //   function (err, result) {
  //     console.log('Complete save the db');
  //   }
  // );
  app.listen(process.env.PORT, function () {
    console.log('Listening on 8080');
  });
});

//GET
app.get('/', function (request, response) {
  response.render('index.ejs');
});
app.get('/write', function (request, response) {
  response.render('write.ejs');
});

app.post('/add', function (request, response) {
  response.send('Submit Complete');
  console.log(request.body);
  console.log(request.body.title);
  console.log(request.body.date);

  //add auto increment
  //findOne({Query})
  db.collection('counter').findOne(
    { name: 'numOfPost' },
    function (err, result) {
      //console.log(result.totalPost);
      var totalPost = result.totalPost;
      db.collection('post').insertOne(
        {
          _id: totalPost + 1,
          title: request.body.title,
          date: request.body.date,
        },
        function (err, result) {
          console.log('Complete save the db');
          //updateOne ({which data do you want to update},{update value},callback function)
          // $set : update operator
          // $inc : increase operator
          // $min : if the orginal value is smaller than updated value, it will update
          // $rename : update name of key
          db.collection('counter').updateOne(
            { name: 'numOfPost' },
            { $inc: { totalPost: 1 } },
            function (err, result) {
              if (err) {
                return console.log(err);
              } else {
                console.log('Update counter collection ');
              }
            }
          );
        }
      );
    }
  );
});

app.get('/list', function (request, response) {
  //pull out all data from Mongodb
  db.collection('post')
    .find()
    .toArray(function (err, result) {
      console.log(result);
      response.render('list.ejs', { posts: result });
    });

  //pull out specific data from Mongodb
});

app.delete('/delete', function (request, response) {
  //request.body contains post number
  console.log(request.body);
  request.body._id = parseInt(request.body._id);
  db.collection('post').deleteOne(request.body, function (err, result) {
    console.log('Complete Deletion');
    response
      .status(200)
      .send({ message: 'Complete delete data' + request.body._id });
  });
});

app.get('/detail/:id', function (request, response) {
  db.collection('post').findOne(
    { _id: parseInt(request.params.id) },
    function (err, result) {
      console.log(result);
      response.render('detail.ejs', { data: result });
    }
  );
});

app.get('/edit/:id', function (request, response) {
  db.collection('post').findOne(
    { _id: parseInt(request.params.id) },
    function (err, result) {
      if (err) {
        return console.log(err);
      }
      console.log(result);
      response.render('edit.ejs', { post: result });
    }
  );
});

app.put('/edit', function (request, response) {
  db.collection('post').updateOne(
    { _id: parseInt(request.body.id) },
    { $set: { title: request.body.title, date: request.body.date } },
    function (err, result) {
      console.log('Complete Update' + result);
      //after update value, redirect the page
      response.redirect('/list');
    }
  );
});

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

//app.use == middleware
app.use(
  session({ secret: 'passcode', resave: true, saveUninitialized: false })
);

app.use(passport.initialize());
app.use(passport.session());

app.get('/login', function (request, response) {
  response.render('login.ejs');
});

//passport.authenticate : login
app.post(
  '/login',
  passport.authenticate('local', {
    failureRedirect: '/fail',
  }),
  function (request, response) {
    response.redirect('/');
  }
);

app.get('/mypage', isLogin, function (request, response) {
  console.log(request.user);
  response.render('mypage.ejs', { user: request.user });
});

//middleware function
function isLogin(request, response, next) {
  if (request.user) {
    next();
  } else {
    response.send('Please login');
  }
}

passport.use(
  new LocalStrategy(
    {
      usernameField: 'id',
      passwordField: 'pw',
      session: true,
      passReqToCallback: false,
    },
    function (userinput_id, userinput_pw, done) {
      console.log(userinput_id, userinput_pw);
      db.collection('login').findOne(
        { id: userinput_id },
        function (err, result) {
          if (err) return done(err);

          if (!result)
            //done(server error, db data, error msg)
            return done(null, false, {
              message: 'Id is not existed in server',
            });

          //should save password with encryption
          if (userinput_pw == result.pw) {
            return done(null, result);
          } else {
            return done(null, false, { message: 'Wrong Password' });
          }
        }
      );
    }
  )
);

//sign up

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  //find the user info from db
  db.collection('login').findOne({ id: id }, function (err, result) {
    if (err) return done(err);
    else done(null, result);
  });
});

//search Function
app.get('/search', (request, response) => {
  console.log(request.query.value);

  db.collection('post')
    .find({ title: request.query.value })
    .toArray((err, result) => {
      if (err) console.log(err);

      response.render('search.ejs', { data: result });
    });
});
