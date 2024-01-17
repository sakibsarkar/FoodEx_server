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
    const token = req.cookies.token
    if (!token) {
        return res.status(401).send({ message: "forbiden access" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decode) => {
        if (err) {
            return res.status(403).send({ message: "unauthorized access" })

        }
        req.userEmail = decode
        next()
    })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.xbiw867.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// collection
const userCollection = client.db("FoodEx").collection("userCollection")
const reqCollection = client.db("FoodEx").collection("reqCollection")
const vendorCollection = client.db("FoodEx").collection("vendorCollection")
const foodCollection = client.db("FoodEx").collection("foodCollection")


// varify admin middlewere
const varifyAdmin = async (req, res, next) => {
    const { email } = req?.userEmail ? req.userEmail : {}

    if (!email) {
        return res.status(401).send({ message: "unauthorized access" })
    }

    const projection = { _id: 0, role: 1 };
    const { role } = await userCollection.findOne({ user_email: email }, { projection })
        ;
    if (role !== "admin") {
        return res.status(403).send({ message: "forbidded access" })

    }

    next()

}

// varify vendor middlewere
const varifyVendor = async (req, res, next) => {
    const { email } = req?.userEmail ? req.userEmail : {}

    if (!email) {
        return res.status(401).send({ message: "unauthorized access" })
    }

    const projection = { _id: 0, role: 1 };
    const { role } = await userCollection.findOne({ user_email: email }, { projection });

    if (role !== "vendor") {
        return res.status(403).send({ message: "forbidded access" })

    }

    next()

}


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });




        // ------user related api -----


        // login token
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

        // remove token
        app.post("/api/logout", async (req, res) => {
            res.clearCookie("token", { maxAge: 0 }).send({ message: "cookie removed" })
        })


        // add user to the Db
        app.post("/api/add/user", varifyToken, async (req, res) => {
            const { email } = req.userEmail
            const body = req.body
            const isExist = await userCollection.findOne({ user_email: email })
            if (isExist) {
                return res.send([{}, { message: "success", isExist: true }])
            }

            const result = await userCollection.insertOne(body)
            res.send([result, { message: "success", isExist: true }])

        })


        // user role 
        app.get("/api/role", async (req, res) => {
            const { email } = req.query
            const find = {
                user_email: email

            }
            const projection = {
                _id: 0,
                role: 1
            }

            const result = await userCollection.findOne(find, { projection: projection });
            return res.send(result)


        })

        // request post for become vendor
        app.post("/api/vendor/request", varifyToken, async (req, res) => {
            const { body } = req
            const result = await reqCollection.insertOne(body)
            res.send(result)
        })



        // check request status
        app.get("/api/my_request", varifyToken, async (req, res) => {
            const { email } = req.userEmail
            const find = { owner_email: email }

            const result = await reqCollection.findOne(find)
            if (!result) {
                return res.send({ isExist: false })
            }

            res.send({ ...result, isExist: true })
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


        // all foods
        app.get("/api/allfoods", async (req, res) => {
            const { limit = 12, currentPage = 0, category, min, max, time } = req.query
            const skip = parseInt(limit) * parseInt(currentPage)

            let find = {}
            if (category !== "All" && category) {
                let replica = { ...find, category: category.toLocaleLowerCase() }
                find = replica
            }

            if (min || max) {
                let replica = {
                    ...find, price: {
                        $gte: parseInt(min),
                        $lte: parseInt(max)
                    }
                }

                find = replica
            }

            if (time !== "All" && time) {
                let replica = {
                    ...find, delivery_time: {

                        $lte: parseInt(time)
                    }
                }

                find = replica
            }

            const result = await foodCollection.find(find).skip(skip).limit(parseInt(limit)).toArray()
            res.send(result)
        })



        // ------- admin related api -------

        // all vendor requests by user

        app.get("/api/all/req", varifyToken, varifyAdmin, async (req, res) => {
            const { status = "pending" } = req.query
            const find = { status: status.toLocaleLowerCase() }
            const result = await reqCollection.find(find).toArray()
            res.send(result)
        })

        //  vendor reequest action 
        app.put('/api/req/process', varifyToken, varifyAdmin, async (req, res) => {
            const { status, id } = req.body
            const find = { _id: new ObjectId(id) }
            const update = {
                $set: {
                    status: status
                }
            }

            const result = await reqCollection.updateOne(find, update)
            res.send(result)

        })


        // add a new vendor 
        app.post("/api/new/vendor", varifyToken, varifyAdmin, (req, res) => {
            const { body } = req
            const result = vendorCollection.insertOne(body)
            res.send(result)
        })

        // change the user status 

        app.put("/api/user/role", varifyToken, varifyAdmin, async (req, res) => {
            const { email, role } = req.body
            const find = { user_email: email }
            const update = {
                $set: {
                    role: role
                }
            }

            const result = await userCollection.updateOne(find, update)
            res.send(result)
        })



        // ------- vendor related api ---------
        app.post("/api/add/item", varifyToken, varifyVendor, async (req, res) => {
            const { body } = req
            const { email } = req.userEmail
            if (body.vendor_email !== email) {
                return res.status(403).send({ message: "forbidded access" })
            }

            const result = await foodCollection.insertOne(body)
            res.send(result)
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