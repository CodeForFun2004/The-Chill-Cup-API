// MongoDB script to insert test loyalty data for userId: 6913fa4fb29787d7ce04ec74
// Run this script in MongoDB shell or using mongo command

db = db.getSiblingDB('chillcup'); // Switch to your database

// Insert test loyalty document
db.loyaltyPoints.insertOne({
  "userId": ObjectId("6913fa4fb29787d7ce04ec74"),
  "totalPoints": 250,
  "history": [
    {
      "orderId": ObjectId("673f1a2b3c4d5e6f789abcd"),
      "pointsEarned": 50,
      "date": new Date("2025-11-01T10:00:00.000Z")
    },
    {
      "orderId": ObjectId("673f1a2b3c4d5e6f789abce"),
      "pointsEarned": 75,
      "date": new Date("2025-11-05T14:30:00.000Z")
    },
    {
      "orderId": ObjectId("673f1a2b3c4d5e6f789abcf"),
      "pointsEarned": 125,
      "date": new Date("2025-11-10T16:45:00.000Z")
    }
  ],
  "createdAt": new Date("2025-11-01T09:00:00.000Z"),
  "updatedAt": new Date("2025-11-10T16:45:00.000Z")
});

print("✅ Test loyalty data inserted successfully!");
print("User ID: 6913fa4fb29787d7ce04ec74");
print("Total Points: 250");
print("History entries: 3");

// Verify the insertion
var result = db.loyaltyPoints.findOne({"userId": ObjectId("6913fa4fb29787d7ce04ec74")});
if (result) {
    print("✅ Verification: Document found in database");
    printjson(result);
} else {
    print("❌ Error: Document not found after insertion");
}
