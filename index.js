const express = require('express');
const { MongoClient, ServerApiVersion, Int32 } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json());





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

    //food features api

    //food add api
    app.post('/addFood', async (req,res)=>{
        const food = req.body;
        // console.log(food);
        const modifyFood = {
            donator_email: food.donator_email,
            expired_date: food.expired_date,
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