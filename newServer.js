const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const axios= require('axios');
//const router = express.Router();
//var session = require('express-session');
//var cookieParser = require('cookie-parser');



const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'abhilash.gj',
    password : '',
    database : 'agentdb'
  }
});

const app = express();

app.use(cors())
app.use(bodyParser.json());
//app.use(session({resave: true, saveUninitialized: true, secret: 'SOMERANDOMSECRETHERE', cookie: { maxAge: 60000 }}));



app.get('/', (req, res)=> {
	db.select('*').from('connection_status')
	.then(data=>{
		res.send(data)
			console.log(data);
	})
	console.log("test")
})

//---------------------------apis for connections------------------------------
//from user, issuer
// initiator is user- sharing
//intiator is trust anchor- issuing

app.post('/initateConnectionn',(req,res)=>{
	console.log("initiating connection",req.body.inviter)
	db('connection_status').returning('*').insert({'inviter':req.body.inviter,'invitee':req.body.invitee,'type':req.body.type})
	.then(response=>{
		console.log("Inserting");
	res.json(response);
	})
	.catch(err=>res.status(400).json('error Inserting data'))
})

app.post('/initateConnection',(req,res)=>{
	console.log("initiating connection",req.body.inviter)
	db('connection_status').returning('*').insert({'inviter':req.body.inviter,'invitee':req.body.invitee,'status':req.body.status})
	.then(response=>{
		console.log("Inserting");
	res.json(response);
	})
	.catch(err=>res.status(400).json('error Inserting data'))
})

//to check for pending requests
app.post('/checkPendingRequests',(req,res)=>{
	console.log("Checking pending requests")
	db.select('*').from('connection_status').where({'invitee':req.body.invitee,'status':'initiated'})
	.then(response=>{
		res.json(response);
	})
	.catch(err=>res.status(400).json('error retrieving data'))
})

//get connections
app.post('/getConnections',(req,res)=>{
	console.log("Retrieving active connections")
	db.select('*').from('connection_status').where({'invitee':req.body.invitee,'status':'connected'}).orWhere({'inviter':req.body.invitee,'status':'connected'})
	.then(response=>{
		console.log(response)
		res.json(response);
	})
})

//---------------------------apis for connections END------------------------------

//accept connection
app.post('/acceptConnection',(req,res)=>{
	console.log("Accepting connection number ", req.body.conid)
   	db('connection_status').returning('*').where({'conid':req.body.conid}).update({'status':'connected'})
   	.then(response=>{
   		console.log("Connection accepted")
   		res.json(response);
   	})
})

//Start Offering credentials
app.post('/shareCredentials',(req,res)=>{
	console.log("Offer  crdentials")
	db('credential_status').returning('*').insert({'sender':req.body.sender,'recipient':req.body.recipient,'type':req.body.type})
	.then(response=>{
		console.log("Offering credentials initiated")
		res.json(response)
	})
})

//accept credential
app.post('/acceptCredentials',(req,res)=>{
	console.log("Accpeting credentials")
	db('credential_status').returning('*').where({'trxid':req.body.trxid,'status':'initiated'}).update({'status':accepted})
	.then(response=>{
		console.log("accepted credentials")
		res.json(response)
	})
})




//accept credentials

//request credential testtttttttttt
const testFunc=async()=>{
  try {
    	const res=await axios.get('http://ec2-13-235-238-26.ap-south-1.compute.amazonaws.com:8081/')
    	// axios.get('http://ec2-13-235-238-26.ap-south-1.compute.amazonaws.com:8080/')
    	// .then(response=>{
    	// 	console.log(response.data)
    	// 	return response.data
    	// })
    	console.log("Callingnn",res.data)
    	return res.data
  } catch (error) {
    //console.error(error)
  }
}


app.post('/reqCredTest',async(req,res)=>{
	console.log("making crdentail reauest Test")
	
	const testRes= await testFunc()
	console.log("-------------------------------+",testRes)
	res.send(testRes)
})



app.listen(8080, ()=> {
  console.log('NEW app is running on port 8080');
})