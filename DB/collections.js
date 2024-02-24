const collections = (client) => {
    const userCollection = client.db("FoodEx").collection("userCollection")
    const commentsCollection = client.db("FoodEx").collection("commentsCollection")
    const reportCollection = client.db("FoodEx").collection("reportCollection")
    const reqCollection = client.db("FoodEx").collection("reqCollection")
    const vendorCollection = client.db("FoodEx").collection("vendorCollection")
    const foodCollection = client.db("FoodEx").collection("foodCollection")
    const myOrdersCollection = client.db("FoodEx").collection("myOrdersCollection")
    const todoOrderCollection = client.db("FoodEx").collection("todoOrderCollection")


    return { userCollection, commentsCollection, reportCollection, reqCollection, vendorCollection, foodCollection, myOrdersCollection, todoOrderCollection }
}


module.exports = collections