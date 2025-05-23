# EatKaro Database Schema Documentation

## 📊 Database Overview
EatKaro uses Firebase Realtime Database with the following main collections and their relationships.

## 🔑 Collections Structure

### 1. Users Collection
```json
{
  "users": {
    "{userId}": {
      "profile": {
        "name": "string",
        "email": "string",
        "phone": "string",
        "profilePicture": "string (URL)",
        "role": "string (customer/restaurant)",
        "createdAt": "timestamp",
        "lastLogin": "timestamp",
        "isVerified": "boolean"
      },
      "addresses": {
        "{addressId}": {
          "type": "string (home/work/other)",
          "address": "string",
          "landmark": "string",
          "city": "string",
          "state": "string",
          "pincode": "string",
          "isDefault": "boolean"
        }
      },
      "paymentMethods": {
        "{paymentId}": {
          "type": "string (card/upi/wallet)",
          "details": "object",
          "isDefault": "boolean",
          "lastUsed": "timestamp"
        }
      },
      "favorites": {
        "{restaurantId}": "boolean"
      },
      "cart": {
        "items": {
          "{itemId}": {
            "restaurantId": "string",
            "name": "string",
            "quantity": "number",
            "price": "number",
            "specialInstructions": "string"
          }
        },
        "total": "number",
        "lastUpdated": "timestamp"
      }
    }
  }
}
```

### 2. Restaurants Collection
```json
{
  "restaurants": {
    "{restaurantId}": {
      "profile": {
        "name": "string",
        "description": "string",
        "logo": "string (URL)",
        "coverImage": "string (URL)",
        "cuisine": ["string"],
        "address": {
          "street": "string",
          "city": "string",
          "state": "string",
          "pincode": "string",
          "coordinates": {
            "latitude": "number",
            "longitude": "number"
          }
        },
        "contact": {
          "phone": "string",
          "email": "string"
        },
        "timings": {
          "openingTime": "string",
          "closingTime": "string",
          "isOpen": "boolean"
        },
        "rating": "number",
        "totalRatings": "number",
        "isActive": "boolean",
        "createdAt": "timestamp"
      },
      "menu": {
        "categories": {
          "{categoryId}": {
            "name": "string",
            "description": "string",
            "image": "string (URL)",
            "isActive": "boolean"
          }
        },
        "items": {
          "{itemId}": {
            "name": "string",
            "description": "string",
            "price": "number",
            "categoryId": "string",
            "image": "string (URL)",
            "isVeg": "boolean",
            "isAvailable": "boolean",
            "preparationTime": "number",
            "customizations": {
              "{optionId}": {
                "name": "string",
                "options": {
                  "{optionValueId}": {
                    "name": "string",
                    "price": "number"
                  }
                }
              }
            }
          }
        }
      },
      "analytics": {
        "daily": {
          "{date}": {
            "orders": "number",
            "revenue": "number",
            "ratings": "number"
          }
        },
        "monthly": {
          "{monthYear}": {
            "orders": "number",
            "revenue": "number",
            "ratings": "number"
          }
        }
      }
    }
  }
}
```

### 3. Orders Collection
```json
{
  "orders": {
    "{orderId}": {
      "customerId": "string",
      "restaurantId": "string",
      "items": {
        "{itemId}": {
          "name": "string",
          "quantity": "number",
          "price": "number",
          "customizations": {
            "{optionId}": {
              "name": "string",
              "selected": "string",
              "price": "number"
            }
          }
        }
      },
      "delivery": {
        "address": {
          "type": "string",
          "address": "string",
          "landmark": "string",
          "city": "string",
          "state": "string",
          "pincode": "string"
        },
        "instructions": "string",
        "estimatedTime": "timestamp"
      },
      "payment": {
        "method": "string",
        "status": "string (pending/completed/failed)",
        "amount": "number",
        "transactionId": "string",
        "paidAt": "timestamp"
      },
      "status": {
        "current": "string (pending/accepted/preparing/ready/delivering/delivered/cancelled)",
        "history": [{
          "status": "string",
          "timestamp": "timestamp",
          "note": "string"
        }]
      },
      "total": {
        "subtotal": "number",
        "tax": "number",
        "deliveryFee": "number",
        "discount": "number",
        "final": "number"
      },
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }
}
```

### 4. Reviews Collection
```json
{
  "reviews": {
    "{reviewId}": {
      "orderId": "string",
      "customerId": "string",
      "restaurantId": "string",
      "rating": "number",
      "comment": "string",
      "images": ["string (URL)"],
      "createdAt": "timestamp",
      "response": {
        "comment": "string",
        "respondedAt": "timestamp"
      }
    }
  }
}
```

### 5. Chats Collection
```json
{
  "chats": {
    "{chatId}": {
      "orderId": "string",
      "participants": {
        "customerId": "string",
        "restaurantId": "string"
      },
      "messages": {
        "{messageId}": {
          "senderId": "string",
          "content": "string",
          "type": "string (text/image)",
          "timestamp": "timestamp",
          "status": "string (sent/delivered/read)"
        }
      },
      "lastMessage": {
        "content": "string",
        "timestamp": "timestamp"
      },
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }
}
```

### 6. Notifications Collection
```json
{
  "notifications": {
    "{userId}": {
      "{notificationId}": {
        "type": "string (order/chat/promotion)",
        "title": "string",
        "message": "string",
        "data": "object",
        "isRead": "boolean",
        "createdAt": "timestamp"
      }
    }
  }
}
```

## 🔒 Security Rules

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "profile": {
          ".read": true,
          ".write": "$uid === auth.uid"
        }
      }
    },
    "restaurants": {
      "$restaurantId": {
        ".read": true,
        ".write": "auth != null && root.child('users').child(auth.uid).child('profile/role').val() === 'restaurant'"
      }
    },
    "orders": {
      "$orderId": {
        ".read": "auth != null && (data.child('customerId').val() === auth.uid || data.child('restaurantId').val() === auth.uid)",
        ".write": "auth != null && (data.child('customerId').val() === auth.uid || data.child('restaurantId').val() === auth.uid)"
      }
    },
    "reviews": {
      "$reviewId": {
        ".read": true,
        ".write": "auth != null && data.child('customerId').val() === auth.uid"
      }
    },
    "chats": {
      "$chatId": {
        ".read": "auth != null && data.child('participants').child(auth.uid).exists()",
        ".write": "auth != null && data.child('participants').child(auth.uid).exists()"
      }
    },
    "notifications": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": "$userId === auth.uid"
      }
    }
  }
}
```

## 📈 Indexes

1. **Orders Collection**
   - `customerId` + `createdAt`
   - `restaurantId` + `createdAt`
   - `status.current` + `createdAt`

2. **Restaurants Collection**
   - `cuisine` + `rating`
   - `isActive` + `rating`

3. **Reviews Collection**
   - `restaurantId` + `createdAt`
   - `customerId` + `createdAt`

4. **Chats Collection**
   - `orderId` + `updatedAt`
   - `participants` + `updatedAt` 