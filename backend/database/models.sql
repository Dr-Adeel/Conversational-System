-- ================================
--   DATABASE INITIALISATION
-- ================================

CREATE DATABASE IF NOT EXISTS conversational_system;
USE conversational_system;

-- ================================
--   TABLE : User
-- ================================

CREATE TABLE IF NOT EXISTS User (
    id_user INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
--   TABLE : Conversation
-- ================================

CREATE TABLE IF NOT EXISTS Conversation (
    id_conv INT AUTO_INCREMENT PRIMARY KEY,
    id_user INT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (id_user) REFERENCES User(id_user)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ================================
--   TABLE : Message
-- ================================

CREATE TABLE IF NOT EXISTS Message (
    id_msg INT AUTO_INCREMENT PRIMARY KEY,
    id_conv INT NOT NULL,
    sender ENUM('user', 'system') NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_conv) REFERENCES Conversation(id_conv)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ================================
--   TABLE : Explanation
-- ================================

CREATE TABLE IF NOT EXISTS Explanation (
    id_exp INT AUTO_INCREMENT PRIMARY KEY,
    id_msg INT NOT NULL,
    method VARCHAR(50) NOT NULL,   -- LIME / SHAP / règles / arbre...
    explanation_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_msg) REFERENCES Message(id_msg)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ================================
--   TABLE : KnowledgeSource
--   (Documents / Référentiels de données)
-- ================================

CREATE TABLE IF NOT EXISTS KnowledgeSource (
    id_doc INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200),
    content LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
--   OPTIONAL: TABLE RELATIONNELLE
--   Pour relier une explication à un document source
-- ================================

CREATE TABLE IF NOT EXISTS Explanation_Document (
    id_link INT AUTO_INCREMENT PRIMARY KEY,
    id_exp INT NOT NULL,
    id_doc INT NOT NULL,
    FOREIGN KEY (id_exp) REFERENCES Explanation(id_exp) 
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (id_doc) REFERENCES KnowledgeSource(id_doc) 
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
