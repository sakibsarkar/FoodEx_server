require('dotenv').config()
const { ObjectId } = require('mongodb')
const express = require("express")
const port = process.env.PORT || 5000
const app = express()
const jwt = require("jsonwebtoken")
const stripe = require("stripe")(process.env.STRIPE)
const applyMiddlewere = require('./middleweres/applyMiddlewere')

applyMiddlewere(app)

// connect db 
const client = require("./DB/connectDB")
// db collections
const collections = require("./DB/collections")

const { userCollection, commentsCollection, reportCollection, reqCollection, vendorCollection, foodCollection, myOrdersCollection, todoOrderCollection } = collections(client())



// varify token 
const varifyToken = require("./middleweres/varificationMiddlweres/tokenVarify")
// varify admin
const varifyAdmin = require("./middleweres/varificationMiddlweres/varifyAdmin")
// varify vendor middlewere
const varifyVendor = require("./middleweres/varificationMiddlweres/varifyVendor")


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
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
                expires: expireDate
            }).send({ success: true });



        })

        // remove token
        app.post("/api/logout", async (req, res) => {
            res.clearCookie("token", {
                maxAge: 0,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',

            }).send({ message: "cookie removed" })
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
            res.send([result, { message: "success", isExist: false }])

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


        // order history
        app.get("/api/orderHistory", varifyToken, async (req, res) => {
            const { email } = req.userEmail
            const find = { user_email: email }
            const result = await myOrdersCollection.find(find).toArray()
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


        // get shop(vendor) details
        app.get("/api/shop", varifyToken, async (req, res) => {
            const { vendor_id } = req.query
            const find = { _id: new ObjectId(vendor_id) }
            const result = await vendorCollection.findOne(find)
            res.send(result)
        })

        // get all shop data
        app.get("/api/all/shop", async (req, res) => {
            const result = await vendorCollection.find().toArray()
            res.send(result)
        })

        // get item of shop(vendor)

        app.get("/api/shop_items", varifyToken, async (req, res) => {
            const { category, id } = req.query
            let find = { vendor_id: id }
            if (category.toLocaleLowerCase() !== "all" && category) {
                const replica = { ...find, category: category.toLocaleLowerCase() }
                find = replica

            }

            const result = await foodCollection.find(find).toArray()
            res.send(result)



        })


        app.post("/api/placeOrder", varifyToken, async (req, res) => {
            const { body } = req
            // add order in vendor 
            const { insertedId } = await todoOrderCollection.insertOne(body)



            // add order in user order history
            const result = await myOrdersCollection.insertOne({
                ...body,
                order_id: insertedId?.toString()
            })



            res.send({ success: true })
        })



        //---------- ----- user comments Related api ------- ---------


        // get all comments for specific vendor profile
        app.get("/api/comments", async (req, res) => {
            const { vendor_id } = req.query

            const find = {
                shop_id: vendor_id,
                visible: true
            }

            const result = await commentsCollection.find(find).toArray()
            res.send(result)

        })


        // post comment
        app.post("/api/comments", varifyToken, async (req, res) => {
            const { body } = req
            if (!body) {
                return;
            }

            const result = await commentsCollection.insertOne(body)
            res.send(result)

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

        // all food name only
        app.get("/api/food/names", async (req, res) => {
            const projection = {
                _id: 0,
                name: 1
            }

            const result = await foodCollection.find({}, { projection }).toArray()
            res.send(result)
        })


        // all foods
        app.get("/api/allfoods", async (req, res) => {
            const { limit = 12, currentPage = 0, category, min, max, time, search } = req.query
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

            if (search) {
                let replica = {
                    ...find
                    , name: new RegExp(search, "i")
                }
                find = replica

            }

            const result = await foodCollection.find(find).skip(skip).limit(parseInt(limit)).toArray()
            const totalData = (await foodCollection.find(find).toArray()).length
            res.send({ result, totalData })
        })


        // payment intent 
        app.post("/api/paymentIntent", varifyToken, async (req, res) => {
            const { price } = req.body

            const amount = parseInt(price) * 100
            const { client_secret } = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"]
            })
            res.send({ client_secret })
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

        // get all users

        app.get("/api/all/user", varifyToken, varifyAdmin, async (req, res) => {

            const { email } = req.userEmail
            const find = {
                user_email: { $ne: email }
            }


            const result = await userCollection.find(find).toArray()
            res.send(result)

        })


        // get all reported comments
        app.get("/api/reports", varifyToken, varifyAdmin, async (req, res) => {
            const result = await reportCollection.find().toArray()
            res.send(result)
        })



        // ------- vendor related api ---------

        // add item
        app.post("/api/add/item", varifyToken, varifyVendor, async (req, res) => {
            const { body } = req
            const { email } = req.userEmail
            if (body.vendor_email !== email) {
                return res.status(403).send({ message: "forbidded access" })
            }

            const result = await foodCollection.insertOne(body)
            res.send(result)
        })

        app.get("/api/myshop", varifyToken, varifyVendor, async (req, res) => {
            const { email } = req.query
            const find = { owner_email: email }
            const projection = {
                _id: 1,
                vendor_name: 1
            }
            const result = await vendorCollection.findOne(find, { projection })

            res.send(result)
        })


        // venodor based products 
        app.get("/api/my_items", varifyToken, varifyVendor, async (req, res) => {
            const { email } = req.query
            const find = { vendor_email: email }
            const result = await foodCollection.find(find).toArray()
            res.send(result)
        })


        // get all pending orders
        app.get("/api/myPendings", varifyToken, varifyVendor, async (req, res) => {

            const { vendor_id } = req.query

            const find = {
                order_status: "pending",
                "orderData.0.vendor_id": vendor_id

            }

            const result = await todoOrderCollection.find(find).toArray()
            res.send(result)
        })



        // post order completed
        app.put("/api/order/complete", varifyToken, varifyVendor, async (req, res) => {
            const { id } = req.query
            const update = {
                $set: {
                    order_status: "completed"
                }
            }
            const result = await todoOrderCollection.updateOne({
                _id: new ObjectId(id)
            }, update)

            const result_ = await myOrdersCollection.updateOne({
                order_id: id
            }, update)

            res.send({ succes: true })
        })


        // get all completed order 
        app.get("/api/my-states", varifyToken, varifyVendor, async (req, res) => {
            const { email } = req.userEmail
            const find = {
                vendor_email: email,
                order_status: "completed"
            }


            const result = await todoOrderCollection.find(find).toArray()
            res.send(result)
        })

        // update comment
        app.put("/api/comment", varifyToken, async (req, res) => {
            const { comment_id, } = req.query

            // userEmail from varifytoken middlewere
            const { userEmail, body } = req

            const find = { _id: new ObjectId(comment_id) }

            // find the comment
            const comment = await commentsCollection.findOne(find)


            if (comment.email !== userEmail.email) {
                return res.status(403).send({ message: "Unauthrized access" })
            }

            const update = {
                $set: {
                    comment: body.comment
                }
            }

            const updateResult = await commentsCollection.updateOne(find, update)
            res.send(updateResult)


        })


        // comment delete

        app.delete("/api/comment", varifyToken, async (req, res) => {
            const { comment_id } = req.query
            const { userEmail } = req

            const find = {
                _id: new ObjectId(comment_id)
            }


            const comment = await commentsCollection.findOne(find)

            if (comment.email !== userEmail.email) {
                return res.status(403).send({ message: "Unauthrized access" })
            }

            const result = await commentsCollection.deleteOne(find)
            res.send(result)



        })


        // post a report for the commennt
        app.post("/api/report/comment", varifyToken, async (req, res) => {
            const { body, userEmail } = req;

            const find = {
                comment_id: body.comment_id,
                reportedBy: userEmail?.email
            }

            // check is there is already a report for this comment;
            const isExist = await reportCollection.findOne(find)

            if (isExist) return res.send({ isExist: true });

            // post the report
            const result = await reportCollection.insertOne(body);
            res.send(result);

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