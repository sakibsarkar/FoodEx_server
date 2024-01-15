require('dotenv').config()
const express = require("express")
const port = process.env.PORT || 5000
const app = express()
const cors = require("cors")
const cookieParser = require("cookie-parser")
const jwt = require("jsonwebtoken")


app.use(express.json())
app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true
}))

app.use(cookieParser())


// varify token 

const varifyToken = (req, res, next) => {
    const token = req.cookie.token
    if (!token) {
        return res.status(401).send({ message: "forbiden access" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decode) => {
        if (err) {
            return res.status(403).send({ message: "unauthorized access" })

        }
        res.userMail = decode
        next()
    })
}


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.xbiw867.mongodb.net/?retryWrites=true&w=majority`;
console.log(process.env.MONGO_USER);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// collection
const foodCollection = client.db("FoodEx").collection("foodCollection")

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });



        // ------user related api -----


        app.post("/api/token", async (req, res) => {
            const email = req.body
            const yearInSecond = 365 * 24 * 60 * 60 //365 day in second
            const expireDate = new Date(Date.now() + yearInSecond * 1000)

            const token = jwt.sign(email, process.env.ACCESS_TOKEN, { expiresIn: "365d" })

            res.cookie("token", token, {
                httpOnly: true,
                sameSite: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
                expires: expireDate
            }).send({ success: true });



        })



        // ------food related api--------

        // category based product
        app.get("/api/food/", async (req, res) => {
            const category = req.query.category;
            const limit = req.query.limit;
            const find = { category: category };
            if (limit) {
                const result = await foodCollection.find(find).limit(parseInt(limit)).toArray();
                return res.send(result);
            }
            const result = await foodCollection.find(find).toArray();
            return res.send(result);
        })





        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port)
app.get("/", (req, res) => {
    res.send("hello from server")
})