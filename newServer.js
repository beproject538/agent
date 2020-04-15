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
//---------------------------apis for connections-----------------------------

app.get('/getPendingOffers',(req,res)=>{
	console.log("Getting pending requests");
	const token=req.headers.authorization;
	axios.get(ledgerUrl+'/pendingConnectionOffer',{headers:{"Authorization":`Bearer ${token}`}})
	.then(response=>{
		console.log("ledger response",response.data)
		res.send(response.data)
	})
})

//to check for pending requests
app.post('/getPendingConnections',(req,res)=>{
	console.log("Checking pending connections")
	db.select('*').from('connection_status_1').where({'senderdid':req.body.did}).whereNot({'status':'connected'}).orWhere({'recipientdid':req.body.did}).whereNot({'status':'connected'})
	.then(response=>{
		console.log("Yes",response)
		res.json(response);
	})
	.catch(err=>res.status(400).json('error retrieving data'))
})


//get connections
app.post('/getConnections',(req,res)=>{
	console.log("Retrieving active connections")
	db.select('*').from('connection_status_1').where({'senderdid':req.body.did,'status':'connected'}).orWhere({'recipientdid':req.body.did,'status':'connected'})
	.then(response=>{
		console.log(response)
		res.json(response);
	})
})



//offer
//request
//respond
//acknowledgement
app.post('/initiateConnection',(req,res)=>{
	console.log("Inside initiate connection")
	//make offer
	var offerStatus=0;
	var requestStatus=0;
	var responseStatus=0;
	var ackStatus=0;;
	const token1=req.headers.authorization;
	const token2=req.body.token;
	const did=req.body.did;
	axios.post(ledgerUrl+'/sendConnectionOffer',
		{
			recipientDid:req.body.recipientDid
		},
		{headers:{"Authorization":`Bearer ${token1}`}}
	)
	.then(response=>{
		console.log("In response",response.data,"did",response.did)
		db('connection_status_1').returning('*').insert({'senderdid':response.data.did,'recipientdid':response.data.recipientDid,'status':'offered'})
		.then(queryResponse=>{
			console.log("Insert query response",queryResponse)
			offerStatus=1;
			console.log("---------------------------Offer done",offerStatus)
			if(offerStatus==1)//make request
			{
				console.log("---------------------------Making request")
				const metadata="requestfrom-"+req.body.did;
				axios.post(ledgerUrl+'/sendConnectionRequest',
				{
					recipientDid:req.body.did,
					metadata:metadata
				},
				{headers:{"Authorization":`Bearer ${token2}`}}
					)
				.then(response1=>{
					console.log("Axios response",response1.data,response1.data.connectionRequest.recipientDid,response1.data.connectionRequest)
					if(response1.data.msg==='nym request sent')
					{
						console.log(response1.data.msg)
						db('connection_status_1').returning('*').where({'senderdid':response1.data.connectionRequest.recipientDid,'recipientdid':response1.data.connectionRequest.did,'status':'offered'}).update({'status':'requested'})
						.then(queryResponse1=>{
							console.log("queryResponse",queryResponse1)
							//res.send(response.data)
							requestStatus=1;
							console.log("---------------------------Request done",requestStatus)
							if(offerStatus==1 && requestStatus==1)
							{
								const metadata="responseto-"+req.body.recipientDid;
								axios.post(ledgerUrl+'/sendConnectionResponse',
								{
									recipientDid:req.body.recipientDid,
									metadata:metadata
								},
								{headers:{"Authorization":`Bearer ${token1}`}}
									)
								.then(response2=>{
									console.log("Axios response",response2.data,response2.data.connectionResponse.recipientDid,response2.data.connectionResponse.did)
									console.log(response2.data.msg)
									db('connection_status_1').returning('*').where({'senderdid':response2.data.connectionResponse.did,'recipientdid':response2.data.connectionResponse.recipientDid,'status':'requested'}).update({'status':'responded'})
									.then(queryResponse2=>{
										console.log("queryResponse",queryResponse2)
										//res.send(response.data)
										responseStatus=1;
										console.log("---------------------------Response done",responseStatus)
										if(offerStatus==1 && requestStatus==1 && responseStatus==1)
										{
											const metadata="ack from-"+req.body.recipientDid;
											axios.post(ledgerUrl+'/sendAcknowledgement',
											{
												recipientDid:req.body.did
											},
											{headers:{"Authorization":`Bearer ${token2}`}}
												)
											.then(response3=>{
												console.log("Axios response",response3.data)
												//if(response.data.msg==='nym request sent')
												{
													//console.log(response.data.msg)
													db('connection_status_1').returning('*').where({'senderdid':response3.data.Response.did,'recipientdid':response3.data.Response.recipientDid,'status':'responded'}).update({'status':'connected'})
													.then(queryResponse3=>{
														console.log("queryResponse",queryResponse3)
														ackStatus=1;
														res.send(response3.data)
													})
												}
											})
										}
									})
								})
							}
						})
					}
				})
			}
		})
	})
	// if(offerStatus==1)//make request
	// {
	// 	console.log("---------------------------Making request")
	// 	const metadata="requestfrom-"+req.body.did;
	// 	axios.post(ledgerUrl+'/sendConnectionRequest',
	// 	{
	// 		recipientDid:req.body.did,
	// 		metadata:metadata
	// 	},
	// 	{headers:{"Authorization":`Bearer ${token2}`}}
	// 		)
	// 	.then(response=>{
	// 		console.log("Axios response",response.data,response.data.connectionRequest.recipientDid,response.data.connectionRequest)
	// 		if(response.data.msg==='nym request sent')
	// 		{
	// 			console.log(response.data.msg)
	// 			db('connection_status_1').returning('*').where({'senderdid':response.data.connectionRequest.recipientDid,'recipientdid':response.data.connectionRequest.did,'status':'offered'}).update({'status':'requested'})
	// 			.then(queryResponse=>{
	// 				console.log("queryResponse",queryResponse)
	// 				//res.send(response.data)
	// 				requestStatus=1;
	// 				console.log("---------------------------Request done",requestStatus)
	// 			})
	// 		}
	// 	})
	// }
	// if(offerStatus==1 && requestStatus==1)
	// {
	// 	const metadata="responseto-"+req.body.recipientDid;
	// 	axios.post(ledgerUrl+'/sendConnectionResponse',
	// 	{
	// 		recipientDid:req.body.recipientDid,
	// 		metadata:metadata
	// 	},
	// 	{headers:{"Authorization":`Bearer ${token1}`}}
	// 		)
	// 	.then(response=>{
	// 		console.log("Axios response",response.data,response.data.connectionResponse.recipientDid,response.data.connectionResponse.did)
	// 		console.log(response.data.msg)
	// 		db('connection_status_1').returning('*').where({'senderdid':response.data.connectionResponse.did,'recipientdid':response.data.connectionResponse.recipientDid,'status':'requested'}).update({'status':'responded'})
	// 		.then(queryResponse=>{
	// 			console.log("queryResponse",queryResponse)
	// 			//res.send(response.data)
	// 			responseStatus=1;
	// 			console.log("---------------------------Response done",responseStatus)
	// 		})
	// 	})
	// }
	// if(offerStatus==1 && requestStatus==1 && responseStatus==1)
	// {
	// 	const metadata="ack from-"+req.body.recipientDid;
	// 	axios.post(ledgerUrl+'/sendAcknowledgement',
	// 	{
	// 		recipientDid:req.body.did
	// 	},
	// 	{headers:{"Authorization":`Bearer ${token2}`}}
	// 		)
	// 	.then(response=>{
	// 		console.log("Axios response",response.data)
	// 		//if(response.data.msg==='nym request sent')
	// 		{
	// 			//console.log(response.data.msg)
	// 			db('connection_status_1').returning('*').where({'senderdid':response.data.Response.did,'recipientdid':response.data.Response.recipientDid,'status':'responded'}).update({'status':'connected'})
	// 			.then(queryResponse=>{
	// 				console.log("queryResponse",queryResponse)
	// 				ackStatus=1;
	// 				res.send(response.data)
	// 			})
	// 		}
	// 	})
	// }
})


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

//---------------------------apis for connections END------------------------------
//---------------------------apis for sharing credentials--------------------------
app.post('/createSchema',(req,res)=>{
	console.log("Creating schemas")
	const token=req.headers.authorization;
	axios.post(ledgerUrl+'/createSchema',
	{
		name:req.body.name,
		attrNames:req.body.attrNames
	},
	{headers:{"Authorization":`Bearer ${token}`}}
		)
	.then(response=>{
		console.log("Axios response")
		db('credential_schema_1').returning('*').insert({'schemaname':req.body.name,'attributes':req.body.attrNames})
		.then(queryResponse=>{
			res.send(response.data)
		})
	})
})

app.get('/getSchemas',(req,res)=>{
	console.log("Inside getSchemas")
	db.select('*').from('credential_schema_1')
	.then(data=>{
		res.send(data)
		console.log(data);
	})
})

app.post('/createCredDef',(req,res)=>{
	console.log("making credDef")
	const token=req.headers.authorization;
	axios.post(ledgerUrl+'/createCredDef',
	{
		name:req.body.name
	},
	{headers:{"Authorization":`Bearer ${token}`}}
		)
	.then(response=>{
		console.log("Axios response",response.data)
		db('credential_schema_1').returning('*').where({'name':req.body.name}).update({'cred_def':'created'})
		.then(queryResponse=>{
			console.log("queryResponse",queryResponse)
			
		})
		res.send(response.data)
	})
})


app.post('/createCredentialOffer',(req,res)=>{
	console.log("Creating cred offer")
	const token=req.headers.authorization;
	axios.post(ledgerUrl+'/createCredentialOffer',
	{
		recipientDid:req.body.recipientDid,
		name:req.body.name
	},
	{headers:{"Authorization":`Bearer ${token}`}}
		)
	.then(response=>{
		console.log("Axios response",response.data)
		if(response.data.authCryptOffer.type==='Buffer')
		{
			db('credential_status_1').returning('*').insert({'schemaname':req.body.name,'senderdid':req.body.did,'recipientdid':req.body.recipientDid,'status':'offered'})
			.then(queryResponse=>{
				res.send(response.data)
			})
		}
	})
	.catch(err=>res.status(400).json('Unable to send offer'))
})

app.post('/createCredentialRequest',(req,res)=>{
	console.log("making cred Req")
	const token=req.headers.authorization;
	axios.post(ledgerUrl+'/createCredentialRequest',
	{
		recipientDid:req.body.recipientDid
	},
	{headers:{"Authorization":`Bearer ${token}`}}
		)
	.then(response=>{
		console.log("Axios response",response.data)
		db('credential_status_1').returning('*').where({'senderdid':req.body.recipientDid,'recipientdid':req.body.did,'status':'offered'}).update({'status':'accepted'})
		.then(queryResponse=>{
			console.log("queryResponse",queryResponse)
			res.send(response.data)
		})
	})
	.catch(err=>res.status(400).json('Unable to send request'))
})

app.post('/getCredentialStatus',(req,res)=>{
	console.log("getting cred Status")
	db.select('*').from('credential_status_1').where({'trxid':req.body.trxid})
	.then(queryResponse=>{
		console.log(queryResponse)
		res.send(queryResponse)
	})
	.catch(err=>res.status(400).json('Unable to query data'))
})

app.post('/sendCredential',(req,res)=>{
	console.log("making cred")
	const token=req.headers.authorization;
	const obj={
	"recipientDid": "5Umo8Wn6qC221WZQnBh4Hk",
	"credValues": {
		"name": {"raw": "Tejas", "encoded": "12345"},
		"gender": {"raw": "M", "encoded": "23456"},
		"dob": {"raw": "4-7-1998", "encoded": "34567"},
		"companyroll": {"raw": "1230978", "encoded": "45678"}
	}
};
	console.log(Object.keys(obj.credValues).length)
	let l=Object.keys(obj.credValues).length;
	for(let i=0;i<l;i++)
	{
		var val1=Math.floor(1000000000000000 + Math.random() * 9000000000000000);
		console.log(val1)
	}
})




//--------------------------apis for sharing credentials END-----------------------
//accept credential




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