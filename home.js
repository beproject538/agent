gqrcode=()=>{
    var temp1=localStorage.getItem("did");
    var temp2=localStorage.getItem("token");
    var obj= new Object();
    var obj=`{"did":${temp1},"token":${temp2}}`;
        
console.log(obj)
                var url='https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='+obj;
        var blob='';
        fetch(url,{
                method:'GET',
               
        }) 
        .then(response=>response.blob())
        .then((blob) => {
    const imageUrl = URL.createObjectURL(blob);
    const img = document.querySelector('img');
    img.addEventListener('load', () => URL.revokeObjectURL(imageUrl));
    document.querySelector('img').src = imageUrl;
});
}

createschema=()=>{
    
    var sname=document.getElementById("schemaname").value;
    var attr=document.getElementById("attributes").value;
    var temp2=localStorage.getItem("token");
    fetch('http://ec2-13-235-238-26.ap-south-1.compute.amazonaws.com:8080/createSchema',{
                method:'post',
                headers:{'Content-Type':'application/json',
                        'Authorization':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZTk2ZDhiODI4MjNjODdhNGU4YjM4YWQiLCJpYXQiOjE1ODY5NDQxODZ9.SbDyFo6hy4dQph9uLtc67g15x6z92RQlZ_58ICK-3jw'},
                body:JSON.stringify({
                    
                        name:sname,
                        attrNames:attr//enter data when needed
                })
        })
        .then(response1=>response1.json())
        .then(data1=>{
            console.log(data1)
               fetch('http://ec2-13-235-238-26.ap-south-1.compute.amazonaws.com:8080/createCredDef',{
                method:'post',
                headers:{'Authorization':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZTk2ZDhiODI4MjNjODdhNGU4YjM4YWQiLCJpYXQiOjE1ODY5NDQxODZ9.SbDyFo6hy4dQph9uLtc67g15x6z92RQlZ_58ICK-3jw'},
                body:JSON.stringify({
                    
                        name:sname,
                       
                })
                })
                .then(response2=>response2.json())
                .then(data2=>{
                       
                        console.log(data2)
                       
                        //console.log(localStorage.getItem("did"))
                })
                
               
                //console.log(localStorage.getItem("did"))
        })
}

createcreddef=()=>{
    
    var sname=document.getElementById("schemaname").value;
    
    var temp2=localStorage.getItem("token");
    fetch('http://ec2-13-235-238-26.ap-south-1.compute.amazonaws.com:8082/getCredDef',{
                method:'post',
                headers:{'Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZTk2ZDhiODI4MjNjODdhNGU4YjM4YWQiLCJpYXQiOjE1ODY5NDQxODZ9.SbDyFo6hy4dQph9uLtc67g15x6z92RQlZ_58ICK-3jw'},
                body:JSON.stringify({
                        name:"aadhaar" 
                })
        })
        .then(response1=>response1.json())
        .then(data1=>{
               
                console.log(data1)
               
                //console.log(localStorage.getItem("did"))
        })
}