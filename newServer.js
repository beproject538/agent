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

const ledgerUrl='http://ec2-13-235-238-26.ap-south-1.compute.amazonaws.com:8082';

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

//---------------------------apis for registering-----------------------------
app.post('/createWallet',(req,res)=>{
	console.log("Creating wallet",req.body.name)
	const id=req.body.name+'_wallet';
	const key=req.body.name+'_wallet_key';
	axios.post(ledgerUrl+'/createuserwallet',
		{
			name:req.body.name,
			id:id,
			key:key
		},
		{headers:{'Content-Type':'application/json'}}
	)
	.then(response=>{
		console.log("In response",response.data)
		res.send(response.data)
	})
	.catch(err=>res.status(400).json('Unable to create wallet'))
})

app.post('/createDid',(req,res)=>{
	console.log("Creating did")
	const info=req.body.name+' public Did';
	const val1=Math.floor(1000000000000000 + Math.random() * 9000000000000000);
	const val2=Math.floor(1000000000000000 + Math.random() * 9000000000000000);
	const seed=val1.toString()+val2.toString();
	console.log(seed)
	const token=req.headers.authorization;
	axios.post(ledgerUrl+'/createDidVerkey',
		{
			info:info,
			seed:seed,
			public:'true'
		}
		,{headers:{"Authorization":`Bearer ${token}`}}
	)
	.then(response=>{
		console.log(response.data)
		db('role_1').returning('*').insert({'did':response.data.did,'role':req.body.role,'name':req.body.name,'verkey':response.data.verkey})
		.then(queryResponse=>{
			console.log("queryResponse",queryResponse)
		})
		res.send(response.data)
	})
})

//---------------------------END apis for registering-----------------------------

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

//accept connection
app.post('/acceptConnection',(req,res)=>{
	console.log("Accepting connection number ", req.body.conid)
   	db('connection_status').returning('*').where({'conid':req.body.conid}).update({'status':'connected'})
   	.then(response=>{
   		console.log("Connection accepted")
   		res.json(response);
   	})
})

//---------------------------apis for connections END------------------------------


//---------------------------INDY apis for sharing credentials--------------------------

//offer
//request
//respond
//acknowledgement
app.post('/makeConnectionOffer',(req,res)=>{
	console.log("Making connection offer from- ",req.headers.authorization," to-",req.body.recipientDid);
	
	const token=req.headers.authorization;
	axios.post(ledgerUrl+'/sendConnectionOffer',
		{
			recipientDid:req.body.recipientDid
		},
		{headers:{"Authorization":`Bearer ${token}`}}
	)
	.then(response=>{
		console.log("In response",response.data,"did",response.did)
		db('connection_status_1').returning('*').insert({'senderdid':response.data.did,'recipientdid':response.data.recipientDid,'status':'offered'})
		.then(queryResponse=>{
			console.log("Insert query response",queryResponse)
		})
		res.send(response.data)
	})
})

app.post('/getPendingOffers',(req,res)=>{
	console.log("Pending offers");
	const token=req.headers.authorization;
	axios.get(ledgerUrl+'/pendingConnectionOffer',
		{
			headers:{'Authorization':`Bearer ${token}`}
		}
	)
	.then(response=>{
		console.log(response)
		res.send(response.data)
	})
})

app.post('/sendConnectionRequest',(req,res)=>{
	console.log("Accepting connection offer from",req.headers.authorization," to-",req.body.recipientDid)
	const token=req.headers.authorization;
	const metadata="requestfrom-"+req.body.recipientDid;
	axios.post(ledgerUrl+'/sendConnectionRequest',
	{
		recipientDid:req.body.recipientDid,
		metadata:metadata
	},
	{headers:{"Authorization":`Bearer ${token}`}}
		)
	.then(response=>{
		console.log("Axios response",response.data,response.data.connectionRequest.recipientDid,response.data.connectionRequest)
		if(response.data.msg==='nym request sent')
		{
			console.log(response.data.msg)
			db('connection_status_1').returning('*').where({'senderdid':response.data.connectionRequest.recipientDid,'recipientdid':response.data.connectionRequest.did,'status':'offered'}).update({'status':'requested'})
			.then(queryResponse=>{
				console.log("queryResponse",queryResponse)
				res.send(response.data)
			})
		}
	})
})

app.post('/sendConnectionResponse',(req,res)=>{
	console.log("Sending connection response",req.headers.authorization," to-",req.body.recipientDid)
	const token=req.headers.authorization;
	const metadata="responseto-"+req.body.recipientDid;
	axios.post(ledgerUrl+'/sendConnectionResponse',
	{
		recipientDid:req.body.recipientDid,
		metadata:metadata
	},
	{headers:{"Authorization":`Bearer ${token}`}}
		)
	.then(response=>{
		console.log("Axios response",response.data,response.data.connectionResponse.recipientDid,response.data.connectionResponse.did)
		//if(response.data.error==='nym request sent')
		//{
			console.log(response.data.msg)
			db('connection_status_1').returning('*').where({'senderdid':response.data.connectionResponse.did,'recipientdid':response.data.connectionResponse.recipientDid,'status':'requested'}).update({'status':'responded'})
			.then(queryResponse=>{
				console.log("queryResponse",queryResponse)
				res.send(response.data)
			})
		//}
	})
})

app.post('/sendConnectionAck',(req,res)=>{
	console.log("acknowledgement from",req.headers.authorization," to-",req.body.recipientDid)
	const token=req.headers.authorization;
	const metadata="requestfrom-"+req.body.recipientDid;
	axios.post(ledgerUrl+'/sendAcknowledgement',
	{
		recipientDid:req.body.recipientDid
	},
	{headers:{"Authorization":`Bearer ${token}`}}
		)
	.then(response=>{
		console.log("Axios response",response.data)
		//if(response.data.msg==='nym request sent')
		{
			//console.log(response.data.msg)
			db('connection_status_1').returning('*').where({'senderdid':response.data.Response.did,'recipientdid':response.data.Response.recipientDid,'status':'responded'}).update({'status':'connected'})
			.then(queryResponse=>{
				console.log("queryResponse",queryResponse)
				res.send(response.data)
			})
		}
	})
})

const testt={
    "response": {
        "n": 1,
        "nModified": 1,
        "ok": 1
    },
    "Response": {
        "@id": "connection-response",
        "acknowledged": true,
        "_id": "5e7f000cc518572687b3aeff",
        "did": "7bXTiH61batvZYagUxaGkR",
        "newDid": "BG9LdcDn8nA7KB8G2fbqh8",
        "newKey": "6bNfjDtvf2bH6vcPj2nazSnuXZC4Uv3XtG7gKB4g6syS",
        "ip": "172.31.32.242",
        "recipientDid": "81LAnQxQfNAvNtJphoxzhR",
        "owner": "5e7efdf8c518572687b3aef6",
        "createdAt": "2020-03-28T07:43:08.597Z",
        "updatedAt": "2020-03-28T07:45:20.180Z",
        "__v": 0
    },
    "nymInfo": {
        "role": null,
        "msg": "nym request sent"
    },
    "msg": "Connected yay!!!!  UwU"
};

app.get('/test',(req,res)=>{
	console.log(testt.Response.did)
})

app.get('/getPendingOffers',(req,res)=>{
	console.log("Getting pending requests");
	const token=req.headers.authorization;
	axios.get(ledgerUrl+'/pendingConnectionOffer',{headers:{"Authorization":`Bearer ${token}`}})
	.then(response=>{
		console.log("ledger response",response.data)
		res.send(response.data)
	})
})

//, { headers: {"Authorization" : `Bearer ${JWTToken}`} }
//---------------------------INDY apis for sharing credentials END--------------------------
//---------------------------apis for sharing credentials--------------------------
app.post('/requestCredentialsFromIssuer',async(req,res)=>{
	console.log("requestCredentialsFromIssuer")
	var baseurl='';
	db.select('*').from('ta_details').where({'taid':req.body.taid/*,'userDID':req.body.did,'name':req.body.name*/})
	.then(response=>{
		baseurl=response[0].url;
		console.log("insiude",baseurl)
		axios.get(baseurl)
		.then(axiosresp=>{
			console.log("axios resp",axiosresp.data)
			res.json(axiosresp.data)
		})
	})
})



//--------------------------apis for sharing credentials END-----------------------
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
const testFunc=async(url)=>{
  try {
  		console.log("in function")
    	const res=await axios.get(url)
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