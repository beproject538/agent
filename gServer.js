const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const axios=require('axios').default;
//const router = express.Router();
//var session = require('express-session');
//var cookieParser = require('cookie-parser');




const app = express();

app.use(cors())
app.use(bodyParser.json());
//app.use(session({resave: true, saveUninitialized: true, secret: 'SOMERANDOMSECRETHERE', cookie: { maxAge: 60000 }}));




app.get('/', (req, res)=> {
	console.log("gServer test")
	res.json({test:"res"})
})




app.listen(8081, ()=> {
  console.log('gServer app is running on port 8081');
})