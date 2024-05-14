const express = require('express');
const { MongoClient, ServerApiVersion, Int32, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware 
app.use(cors({
    origin:[`${process.env.CLIENT_URL}`, `${process.env.SERVER_URL}`],
    credentials:true
}));
app.use(express.json());
app.use(cookieParser());


//custom middleware

const verifyToken = async (req,res,next)=>{
  const token=req.cookies.token;
  if(!token){
      return res.status(401).send({message: 'unAuthorized'});
  }
  if(token){
      jwt.verify(token,process.env.ACCESS_SECRET_TOKEN, (error,decoded)=>{
          if(error){
              return res.status(401).send({message: 'unAuthorized access'});
          }
          if(decoded){
              // console.log(decoded);
              req.user = decoded.email;
              next();
          }
      })
  }
  
}







const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@atlascluster.k7qynmg.mongodb.net/?retryWrites=true&w=majority&appName=AtlasCluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodsCollection = client.db("foodsDB").collection("foods");



    //auth related api

    //create cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    //create a jwt token for user api
    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      // console.log(user);
      const token = await jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {expiresIn:'1hr'});
      res.cookie('token',token,{cookieOptions})
      .send({success:true})
    })

    //logout api
    app.post('/logOut', async(req,res)=>{
      // const user = req.body;
      // console.log("user-logout", user);
      res.clearCookie('token', {...cookieOptions, maxAge:0})
      .send({success:true})
    })












    //food features api

    //food add api
    app.post('/addFood', verifyToken, async (req,res)=>{
        const food = req.body;
        // console.log(food);
        const modifyFood = {
            donator_email: food.donator_email,
            expired_date: new Date(food.expired_date),
            food_name: food.food_name,
            food_quantity: new Int32(food.food_quantity),
            food_status: food.food_status,
            notes: food.notes,
            photo_url: food.photo_url,
            pickup_location: food.pickup_location,
            donator_image: food.donator_image,
            donator_name: food.donator_name,
          };
          
        const result = await foodsCollection.insertOne(modifyFood);
          res.send(result)
    })
    
    //all food get api
    app.get('/foods', async(req,res)=>{
        const result = await foodsCollection.find().sort({food_quantity:-1},).limit(6).toArray();
        res.send(result);
    })

    //all available foods
    app.get('/availableFoods', async(req,res)=>{
        const result= await foodsCollection.find({food_status:'available',}).toArray();
        res.send(result);
    })

    //for search available foods
    app.get('/searchFood', async(req,res)=>{
        const query = req.query?.search;
        const result = await foodsCollection.find({food_name:{$regex:query,$options:'i'}, food_status:'available'}).toArray();
        res.send(result);
    })

    //for sort available foods by expired date descending
    app.get('/sortFoods/descending', async(req,res)=>{
        const result= await foodsCollection.find({food_status:'available'}).sort({expired_date:-1}).toArray();
        res.send(result);
    })

    //for sort available foods by expired date ascending
    app.get('/sortFoods/ascending', async(req,res)=>{
        const result= await foodsCollection.find({food_status:'available'}).sort({expired_date:1}).toArray();
        res.send(result);
    }) 


    //for a single food get api 
    app.get('/food/:id', verifyToken, async(req,res)=>{
      // console.log("cookies", req.cookies);
      const id = req.params.id;
      // console.log(id);
      const query = {_id:new ObjectId(id)}
      const result = await foodsCollection.findOne(query);
      res.send(result);
    })

    //for a single food patch api
    app.patch('/food/:id', verifyToken, async(req, res)=>{
      const id= req.params.id;
      const updateValue= req.body;
      // console.log(updateValue);
      // console.log(id);
      const query = {_id:new ObjectId(id)};
      const options = { upsert: true };
      const updateFood = {
        $set: {
          notes: updateValue.notes,
          requested_date: new Date(updateValue.request_date),
          food_status: updateValue.food_status,
          requested_user: updateValue.request_user
        },
      };
      const result = await foodsCollection.updateOne(query,updateFood,options);
      res.send(result);
    })


    //all available foods load api by specific user added food
    app.get('/userFoods', verifyToken, async (req,res)=>{
        const user = req.query;
        // console.log(user);
        const result = await foodsCollection.find({donator_email: user?.email}).toArray();
        res.send(result);
    } )


    //all requested food fetch api by user
    app.get('/requestedFoods', verifyToken, async(req,res)=>{
      const request_user= req.query;
      // console.log(request_user);
      const result = await foodsCollection.find({requested_user:request_user?.email}).toArray();
      res.send(result);
    })

    //handle delete food api
    app.delete('/deleteFood/:id', verifyToken, async(req,res)=>{
       const id=req.params.id;
       const result = await foodsCollection.deleteOne({_id:new ObjectId(id)});
       res.send(result);
    })

    //update food api 
    app.patch('/updateFood/:id', verifyToken, async(req,res)=>{
      // console.log('token ', req.cookies);
        const id= req.params.id;
        const query = {_id: new ObjectId(id)}
        // console.log(id);
        const food = req.body;
        const options = { upsert: true };
        const updateFood = {
          $set:{
            food_name:food.food_name,
            photo_url:food.photo_url,
            donator_name:food.donator_name,
            donator_image:food.donator_image,
            expired_date:new Date(food.expired_date),
            food_quantity:new Int32(food.food_quantity),
            pickup_location:food.pickup_location,
            notes:food.notes,
            food_status:food.food_status,
          }
        }
        // console.log(updateFood);

        const result = (await foodsCollection.updateOne(query,updateFood,options));
        res.send(result);
    })

    




    // Send a ping to confirm a successful connection
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send("botanica food items server is running!");
})

app.listen(port, () =>{
    console.log(` listening port from ${port}`);
})