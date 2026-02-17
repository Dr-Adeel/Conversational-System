import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import hashlib
import hmac

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/conversational_system")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")

try:
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    db = client.conversational_system
    print("✓ Connected to MongoDB successfully")
except ConnectionFailure as e:
    print(f"✗ MongoDB connection failed: {e}")
    db = None

def get_products():
    """Get all products from MongoDB"""
    if db is None:
        return []
    
    products_collection = db.products
    products = list(products_collection.find({}))
    
    # Convert ObjectId to string for JSON serialization
    for product in products:
        product["_id"] = str(product["_id"])
        # If product contains a nested `specs` dict, promote those keys to top-level
        # so callers can access `ram`, `storage`, `color`, etc. directly.
        specs = product.get("specs") or {}
        if isinstance(specs, dict):
            for k, v in specs.items():
                # don't overwrite existing top-level keys unless empty
                if v is None:
                    continue
                if k not in product or not product.get(k):
                    product[k] = v
        # Normalize some common string fields for easier matching in search
        for fld in ("name", "brand", "desc", "color"):
            if product.get(fld) and isinstance(product.get(fld), str):
                product[fld] = product[fld].strip()
    
    return products

def hash_password(password: str) -> str:
    """Hash password using PBKDF2"""
    salt = hashlib.sha256(SECRET_KEY.encode()).digest()
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000).hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return hash_password(plain_password) == hashed_password

def get_db_user(email: str):
    """Get user from MongoDB by email"""
    if db is None:
        return None
    
    users_collection = db.users
    user = users_collection.find_one({"email": email})
    return user

def create_db_user(email: str, password: str, username: str) -> bool:
    """Create a new user in MongoDB"""
    if db is None:
        return False
    
    users_collection = db.users
    
    # Check if user already exists
    if users_collection.find_one({"email": email}):
        return False
    
    # Hash password and create user
    hashed_password = hash_password(password)
    user_data = {
        "email": email,
        "username": username,
        "password": hashed_password
    }
    
    result = users_collection.insert_one(user_data)
    return result.inserted_id is not None

def save_conversation(user_email: str, conversation_id: str, messages: list):
    """Save or update a conversation for a user"""
    if db is None:
        return False
    
    conversations_collection = db.conversations

    conv_id = str(conversation_id)
    
    conversation_data = {
        "user_email": user_email,
        "conversation_id": conv_id,
        "messages": messages,
        "timestamp": messages[-1].get("timestamp") if messages else None
    }
    
    # Update if exists, insert if not
    result = conversations_collection.update_one(
        {"user_email": user_email, "conversation_id": conv_id},
        {"$set": conversation_data},
        upsert=True
    )
    
    return result.acknowledged

def get_user_conversations(user_email: str, limit: int = 6):
    """Get all conversations for a user, sorted by most recent"""
    if db is None:
        return []
    
    conversations_collection = db.conversations
    conversations = list(
        conversations_collection.find({"user_email": user_email})
        .sort("timestamp", -1)
        .limit(limit)
    )
    
    # Convert ObjectId to string
    for conv in conversations:
        conv["_id"] = str(conv["_id"])
    
    return conversations

def delete_conversation(user_email: str, conversation_id: str):
    """Delete a specific conversation"""
    if db is None:
        return False
    
    conversations_collection = db.conversations
    conv_id = str(conversation_id)
    result = conversations_collection.delete_one({
        "user_email": user_email,
        "conversation_id": conv_id
    })
    
    return result.deleted_count > 0
