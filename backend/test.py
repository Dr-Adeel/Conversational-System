from database.db_operations import *

# 1. Create user
id_user = insert_user("ghizlane", "ghizlane@example.com")
print("User ID:", id_user)

# 2. Start conversation
id_conv = start_conversation(id_user)
print("Conversation ID:", id_conv)

# 3. Add message
id_msg = add_message(id_conv, "user", "Bonjour, que pouvez-vous faire ?")
print("Message ID:", id_msg)

# 4. Add explanation
id_exp = add_explanation(id_msg, "rules", "L'IA a détecté une requête d'accueil.")
print("Explanation ID:", id_exp)

# 5. Retrieve conversation
print(get_conversation(id_conv))
