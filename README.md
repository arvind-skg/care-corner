**🌿 Care Corner
Anonymous Peer Support Platform (Flask + PostgreSQL)**

Care Corner is a secure, anonymous peer-support web platform designed for students and young adults to share thoughts, emotions, and personal concerns without fear of judgment.

The platform promotes empathy, privacy, and emotional well-being through a moderated and safe online community.

🚀 Key Features

🔐 Secure User Authentication (Argon2 Password Hashing)

🕊️ Anonymous Posting System

💬 Reaction & Peer Support System

📊 Private User Dashboard

🛡️ Admin Moderation Panel

🌗 Light/Dark Mode Support

📈 Engagement Tracking

🔒 Secure PostgreSQL Database

🏗️ System Architecture

Care Corner follows a 3-Tier Architecture:

Frontend → Flask Backend → PostgreSQL Database

Frontend handles UI and API requests.

Flask manages business logic and routing.

PostgreSQL stores user, post, and reaction data securely.

🛠️ Technical Stack
🔹 Frontend

HTML5

CSS3

JavaScript (ES6+)

CSS Flexbox & Grid

CSS Variables (Theme Management)

Fetch API

🔹 Backend

Python 3.11

Flask 2.3

psycopg2

Argon2-cffi

Flask-CORS

🔹 Database

PostgreSQL 15

Manual SQL Schema Migration

🔹 Deployment

Current Status: Hosted Locally

Future Plan: Render / AWS / Cloud Deployment

📂 Project Structure
care-corner/
│
├── app.py
├── requirements.txt
├── static/
│   ├── css/
│   └── js/
├── templates/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   └── dashboard.html
├── database/
│   └── schema.sql
└── README.md
⚙️ Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/your-username/care-corner.git
cd care-corner
2️⃣ Create Virtual Environment
python -m venv venv
source venv/bin/activate
# Windows: venv\Scripts\activate
3️⃣ Install Dependencies
pip install -r requirements.txt
4️⃣ Setup PostgreSQL Database

Create a database named: care_corner

Run schema file:

psql -U postgres -d care_corner -f database/schema.sql
5️⃣ Run Application
python app.py

Open in browser:

http://127.0.0.1:5000
🔐 Security Features

Argon2 password hashing

Session-based authentication

Input validation & content filtering

Secure SQL queries (Parameterized)

CORS protection

📊 Future Enhancements

AI-based Sentiment Analysis

Anonymous Chatbot Support

Real-time Notifications

Email Verification

Cloud Deployment

REST API Documentation

🎯 Problem Statement

Students and young adults often hesitate to express emotional or personal struggles due to fear of judgment or identity exposure. Care Corner provides a secure and anonymous digital space that enables open sharing, peer support, and emotional connection.

📜 License

Copyright © 2026 Arvind SK
All Rights Reserved.

This project, Care Corner, including its source code, architecture, design, and documentation, is the intellectual property of Arvind SK.

No part of this project may be copied, modified, distributed, published, or used for commercial or non-commercial purposes without explicit written permission from the author.

Unauthorized use, reproduction, or distribution is strictly prohibited.

👨‍💻 Developed By

Arvind SK
Flask-Based Anonymous Peer Support Platform
