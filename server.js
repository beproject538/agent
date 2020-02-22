const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const router = express.Router();
var session = require('express-session');
var cookieParser = require('cookie-parser');



const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'abhilash.gj',
    password : '',
    database : 'meetingRoom'
  }
});

const app = express();

app.use(cors())
app.use(bodyParser.json());
app.use(cookieParser());
//app.use(session({resave: true, saveUninitialized: true, secret: 'SOMERANDOMSECRETHERE', cookie: { maxAge: 60000 }}));

app.use(session({
    key: 'user_sid',
    secret: 'somerandonstuffs',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));

var sessionChecker = (req, res, next) => {
	console.log("Session checker");
    if (req.session.user && req.cookies.user_sid) {
        res.redirect('/dashboard');
    } else {
        next();
    }    
};



app.get('/', (req, res)=> {
	//res.redirect(302,'http://flipkart.com');
	db.select('email','password').from('login')
	.then(data=>{
		req.session.fullname = "Nic Raboy";
			console.log("rest",req.body.email,"cust",req.body.password);
			res.send(req.session.user);
			console.log(req.session.user);
			//res.redirect(302,'http://google.com');
			console.log(req.session.fullname);
	})
})

app.post('/login',(req,res)=>{
	db.select('email','password').from('login').where({'email':req.body.email,'password':req.body.password})
.then(data=>{
			console.log("rest",req.body.email,"cust",req.body.password);
			if(data[0].email==req.body.email && data[0].password==req.body.password)
			{
				req.session.email=req.body.email;
				console.log(req.session.email);
				res.json("success");
				//return res.redirect("/contactus");
			}
			else
			{
				console.log("Else");
				res.json("No ");
				res.redirect("/register");
			}
	})
	.catch(err=>res.status(400).json('error getting data'))
})

app.post('/register',(req,res)=>{
	console.log("Inserting")
	db('login').returning('*').insert({'email':req.body.email,'password':req.body.password})
	.then(response=>{
		console.log("Inserting");
	res.json(response);
	})
	.catch(err=>res.status(400).json('error Inserting data'))
})


app.post('/getBookings',(req,res)=>{
	db.select('*').from('bookings').where({'roomnum':req.body.roomnum}).orderBy('eventdate','asc').orderBy('eventtime','asc')
	.then(data=>{
		res.json(data);
	})
	.catch(err=>res.status(400).json('error getting data'))
})

app.post('/getBookingsEmail',(req,res)=>{
	db.select('*').from('bookings').where({'email':req.body.email}).orderBy('eventdate','asc').orderBy('eventtime','asc')
	.then(data=>{
		res.json(data);
	})
	.catch(err=>res.status(400).json('error getting data'))
})

app.post('/makeBooking',(req,res)=>{
	db('bookings').returning('*').insert({email:req.body.email,eventname:req.body.eventname,people:req.body.people,eventdate:req.body.eventdate,eventtime:req.body.eventtime,endtime:req.body.endtime,roomnum:req.body.roomnum,roomname:req.body.roomname})
	.then(response=>{
		console.log("Inserting ",req.body.email,req.body.eventname,req.body.people,req.body.eventdate,req.body.eventtime,req.body.endtime,req.body.roomnum);
	res.json(response);
	})
	.catch(err=>res.status(400).json('error getting data'))
})



app.listen(3000, ()=> {
  console.log('app is running on port 3000');
})