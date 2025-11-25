from database.db_connection  import get_connection

def insert_user(username, email):
    conn = get_connection()
    cursor = conn.cursor()
    sql = "INSERT INTO User (username, email) VALUES (%s, %s)"
    values = (username, email)
    cursor.execute(sql, values)
    conn.commit()
    return cursor.lastrowid

def start_conversation(id_user):
    conn = get_connection()
    cursor = conn.cursor()
    sql = "INSERT INTO Conversation (id_user) VALUES (%s)"
    cursor.execute(sql, (id_user,))
    conn.commit()
    return cursor.lastrowid

def add_message(id_conv, sender, content):
    conn = get_connection()
    cursor = conn.cursor()
    sql = "INSERT INTO Message (id_conv, sender, content) VALUES (%s, %s, %s)"
    cursor.execute(sql, (id_conv, sender, content))
    conn.commit()
    return cursor.lastrowid


def add_explanation(id_msg, method, explanation_text):
    conn = get_connection()
    cursor = conn.cursor()
    sql = "INSERT INTO Explanation (id_msg, method, explanation_text) VALUES (%s, %s, %s)"
    cursor.execute(sql, (id_msg, method, explanation_text))
    conn.commit()
    return cursor.lastrowid


def get_conversation(id_conv):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    sql = """
    SELECT Message.id_msg, Message.sender, Message.content, Explanation.explanation_text
    FROM Message
    LEFT JOIN Explanation ON Message.id_msg = Explanation.id_msg
    WHERE id_conv = %s
    ORDER BY timestamp ASC
    """

    cursor.execute(sql, (id_conv,))
    return cursor.fetchall()

