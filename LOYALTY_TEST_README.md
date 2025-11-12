# Loyalty Points Testing Documentation

## Overview
This document provides instructions for testing the loyalty points system with user ID: `6913fa4fb29787d7ce04ec74`.

## Test Data

### User Information
- **User ID**: `6913fa4fb29787d7ce04ec74`
- **Total Points**: 250 points
- **History Entries**: 3 transactions

### Sample History Data
1. **Order ID**: `673f1a2b3c4d5e6f789abcd` - 50 points earned on 2025-11-01
2. **Order ID**: `673f1a2b3c4d5e6f789abce` - 75 points earned on 2025-11-05
3. **Order ID**: `673f1a2b3c4d5e6f789abcf` - 125 points earned on 2025-11-10

## Files Created

### 1. `test_loyalty_user.json`
MongoDB Extended JSON document format for direct import using `mongoimport --jsonArray`.

### 2. `test_loyalty_user_simple.json`
Simple JSON format for manual insertion or alternative import methods.

### 3. `insert_test_loyalty.js`
MongoDB shell script for inserting test data programmatically.

## How to Insert Test Data

### Option 1: Using mongoimport (JSON file)
```bash
mongoimport --db chillcup --collection loyaltyPoints --file test_loyalty_user.json --jsonArray
```

### Option 2: Using MongoDB Shell Script
```bash
mongosh < insert_test_loyalty.js
```

Or connect to MongoDB shell and run:
```javascript
load('insert_test_loyalty.js')
```

### Option 3: Manual Insertion in MongoDB Compass
1. Open MongoDB Compass
2. Connect to your database
3. Navigate to `chillcup.loyaltyPoints` collection
4. Click "Add Data" → "Insert Document"
5. Copy and paste the content from `test_loyalty_user_simple.json`

### Option 4: Using Node.js Script (Alternative)
If you prefer to use Node.js, create a script:
```javascript
const { MongoClient, ObjectId } = require('mongodb');

async function insertTestData() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('chillcup');

  const testData = {
    userId: new ObjectId("6913fa4fb29787d7ce04ec74"),
    totalPoints: 250,
    history: [
      {
        orderId: new ObjectId("673f1a2b3c4d5e6f789abcd"),
        pointsEarned: 50,
        date: new Date("2025-11-01T10:00:00.000Z")
      },
      // ... other history entries
    ],
    createdAt: new Date("2025-11-01T09:00:00.000Z"),
    updatedAt: new Date("2025-11-10T16:45:00.000Z")
  };

  await db.collection('loyaltyPoints').insertOne(testData);
  console.log('Test data inserted successfully');
  await client.close();
}

insertTestData();
```

## API Endpoints to Test

### 1. Get User Points
```http
GET /api/loyalty/me
Authorization: Bearer <user_token>
```

**Expected Response:**
```json
{
  "totalPoints": 250
}
```

### 2. Get Point History
```http
GET /api/loyalty/history
Authorization: Bearer <user_token>
```

**Expected Response:**
```json
[
  {
    "orderId": {
      "_id": "673f1a2b3c4d5e6f789abcd",
      "total": 50000,
      "createdAt": "2025-11-01T10:00:00.000Z"
    },
    "pointsEarned": 50,
    "date": "2025-11-01T10:00:00.000Z"
  },
  {
    "orderId": {
      "_id": "673f1a2b3c4d5e6f789abce",
      "total": 75000,
      "createdAt": "2025-11-05T14:30:00.000Z"
    },
    "pointsEarned": 75,
    "date": "2025-11-05T14:30:00.000Z"
  },
  {
    "orderId": {
      "_id": "673f1a2b3c4d5e6f789abcf",
      "total": 125000,
      "createdAt": "2025-11-10T16:45:00.000Z"
    },
    "pointsEarned": 125,
    "date": "2025-11-10T16:45:00.000Z"
  }
]
```

### 3. Get Available Vouchers
```http
GET /api/loyalty/available-vouchers
Authorization: Bearer <user_token>
```

**Expected Response:**
```json
{
  "totalPoints": 250,
  "vouchers": [
    {
      "_id": "voucher_id",
      "title": "Giảm 20%",
      "description": "Giảm 20% cho đơn từ 100k",
      "promotionCode": "DISCOUNT20",
      "discountPercent": 20,
      "requiredPoints": 100,
      "expiryDate": "2025-12-31T23:59:59.000Z",
      "image": "image_url"
    }
  ]
}
```

### 4. Redeem Voucher (if user has enough points)
```http
POST /api/loyalty/redeem
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "discountId": "voucher_id_here"
}
```

**Expected Response:**
```json
{
  "message": "Đổi voucher thành công 🎉"
}
```

## Testing Scenarios

### Scenario 1: View Points
- User logs in with userId: `6913fa4fb29787d7ce04ec74`
- Navigate to catalog screen
- Verify membership card shows "250 PI"

### Scenario 2: View History
- Access loyalty history endpoint
- Verify 3 history entries are returned
- Check dates and points earned match test data

### Scenario 3: Redeem Voucher
- Check available vouchers
- Attempt to redeem a voucher requiring ≤ 250 points
- Verify success message and points deduction

### Scenario 4: Insufficient Points
- Attempt to redeem a voucher requiring > 250 points
- Verify error: "Không đủ điểm để đổi voucher"

## Points Calculation Logic
- 1 point = 1,000 VND spent
- Points are earned after successful order payment
- Points can be redeemed for vouchers based on `requiredPoints` field

## Cleanup
After testing, you can remove the test data:
```javascript
db.loyaltyPoints.deleteOne({"userId": ObjectId("6913fa4fb29787d7ce04ec74")});
```

## Notes
- Ensure the user with ID `6913fa4fb29787d7ce04ec74` exists in the `users` collection
- The order IDs in history are sample data and may not correspond to real orders
- Test both success and error scenarios for comprehensive testing
